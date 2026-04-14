--[[
	MDA Spec Validator
	Spec: Framework tool (no MEC ID — this is a development-time utility)

	Parses spec frontmatter from all .md files in specs/ and validates:
	1. All trace references resolve to existing specs
	2. No mechanics exist without dynamic traces ("in vacuo" check)
	3. No assets exist without mechanic AND aesthetic traces
	4. All tuning specs trace to all three layers (MEC, DYN, AES)
	5. Spec IDs are unique within their layer
	6. No orphaned specs (exist but never referenced by anything)

	Usage (outside Roblox, using Lune or similar Luau runtime):
		lune run src/tools/validate-specs.luau

	Usage (inside Roblox, via command bar or plugin):
		Copy the validate() function and run it with spec content loaded from
		ModuleScripts or StringValues.

	For environments without filesystem access, this module also exports
	validateFromTables() which accepts pre-parsed spec metadata.
]]

local Validator = {}

--------------------------------------------------------------------------------
-- Types
--------------------------------------------------------------------------------

export type SpecMeta = {
	id: string,            -- e.g., "AES-001", "MEC-002"
	name: string,
	layer: string,         -- "AES", "DYN", "MEC", "TUN", "AST", "GAME"
	file: string,          -- file path
	tracesTo: { string },  -- list of spec IDs this traces to
}

export type ValidationResult = {
	passed: boolean,
	errors: { string },
	warnings: { string },
	stats: {
		totalSpecs: number,
		byLayer: { [string]: number },
		traceLinks: number,
		orphaned: number,
	},
}

--------------------------------------------------------------------------------
-- Frontmatter Parser
--------------------------------------------------------------------------------

local LAYER_PREFIXES = {
	["AES"] = true,
	["DYN"] = true,
	["MEC"] = true,
	["TUN"] = true,
	["AST"] = true,
	["GAME"] = true,
}

local function extractLayer(id: string): string?
	local prefix = string.match(id, "^(%u+)%-")
	if prefix and LAYER_PREFIXES[prefix] then
		return prefix
	end
	return nil
end

local function parseFrontmatter(content: string, filePath: string): { SpecMeta }
	-- Extract YAML frontmatter between --- delimiters
	local frontmatter = string.match(content, "^%-%-%-\n(.-)\n%-%-%-")
	if not frontmatter then
		return {}
	end

	local specs: { SpecMeta } = {}

	-- Extract ID(s) — may be comma-separated (e.g., "AST-001, AST-005")
	local idLine = string.match(frontmatter, "id:%s*(.+)")
	if not idLine then
		return {}
	end

	local ids: { string } = {}
	for id in string.gmatch(idLine, "([%u]+%-[%d]+)") do
		table.insert(ids, id)
	end

	-- Extract name
	local name = string.match(frontmatter, "name:%s*(.+)") or "unknown"

	-- Extract all trace references
	local allTraces: { string } = {}
	for traceLine in string.gmatch(frontmatter, "traces_to_%w+:%s*%[(.-)%]") do
		for ref in string.gmatch(traceLine, "([%u]+%-[%d]+)") do
			table.insert(allTraces, ref)
		end
	end

	-- Create a SpecMeta for each ID in this file
	for _, id in ids do
		local layer = extractLayer(id)
		if layer then
			table.insert(specs, {
				id = id,
				name = name,
				layer = layer,
				file = filePath,
				tracesTo = allTraces,
			})
		end
	end

	return specs
end

--------------------------------------------------------------------------------
-- Validation Rules
--------------------------------------------------------------------------------

local function validateTraceResolution(specs: { SpecMeta }): ({ string }, { string })
	local errors: { string } = {}
	local warnings: { string } = {}

	-- Build ID lookup
	local idExists: { [string]: boolean } = {}
	for _, spec in specs do
		idExists[spec.id] = true
	end

	-- Check every trace reference resolves
	for _, spec in specs do
		for _, traceId in spec.tracesTo do
			if not idExists[traceId] then
				table.insert(errors, string.format(
					"[BROKEN TRACE] %s (%s) traces to %s which does not exist",
					spec.id, spec.file, traceId
				))
			end
		end
	end

	return errors, warnings
end

local function validateNoVacuoMechanics(specs: { SpecMeta }): ({ string }, { string })
	local errors: { string } = {}
	local warnings: { string } = {}

	for _, spec in specs do
		if spec.layer == "MEC" then
			local hasDynTrace = false
			for _, traceId in spec.tracesTo do
				if extractLayer(traceId) == "DYN" then
					hasDynTrace = true
					break
				end
			end
			if not hasDynTrace then
				table.insert(errors, string.format(
					"[IN VACUO] %s (%s) has no trace to any DYN spec — mechanics must not exist in isolation",
					spec.id, spec.file
				))
			end
		end
	end

	return errors, warnings
end

local function validateAssetTraces(specs: { SpecMeta }): ({ string }, { string })
	local errors: { string } = {}
	local warnings: { string } = {}

	for _, spec in specs do
		if spec.layer == "AST" then
			local hasMec = false
			local hasAes = false
			for _, traceId in spec.tracesTo do
				local layer = extractLayer(traceId)
				if layer == "MEC" then hasMec = true end
				if layer == "AES" then hasAes = true end
			end
			if not hasMec then
				table.insert(errors, string.format(
					"[ORPHANED ASSET] %s (%s) has no trace to any MEC spec — where is this asset used?",
					spec.id, spec.file
				))
			end
			if not hasAes then
				table.insert(warnings, string.format(
					"[MISSING AESTHETIC] %s (%s) has no trace to any AES spec — why does this asset exist?",
					spec.id, spec.file
				))
			end
		end
	end

	return errors, warnings
end

local function validateTuningCompleteness(specs: { SpecMeta }): ({ string }, { string })
	local errors: { string } = {}
	local warnings: { string } = {}

	for _, spec in specs do
		if spec.layer == "TUN" then
			local hasMec, hasDyn, hasAes = false, false, false
			for _, traceId in spec.tracesTo do
				local layer = extractLayer(traceId)
				if layer == "MEC" then hasMec = true end
				if layer == "DYN" then hasDyn = true end
				if layer == "AES" then hasAes = true end
			end
			if not (hasMec and hasDyn and hasAes) then
				local missing = {}
				if not hasMec then table.insert(missing, "MEC") end
				if not hasDyn then table.insert(missing, "DYN") end
				if not hasAes then table.insert(missing, "AES") end
				table.insert(warnings, string.format(
					"[INCOMPLETE TUNING] %s (%s) missing traces to: %s — tuning should trace all layers",
					spec.id, spec.file, table.concat(missing, ", ")
				))
			end
		end
	end

	return errors, warnings
end

local function validateUniqueIds(specs: { SpecMeta }): ({ string }, { string })
	local errors: { string } = {}
	local warnings: { string } = {}

	local seen: { [string]: string } = {}  -- id → file
	for _, spec in specs do
		if seen[spec.id] then
			table.insert(errors, string.format(
				"[DUPLICATE ID] %s appears in both %s and %s",
				spec.id, seen[spec.id], spec.file
			))
		else
			seen[spec.id] = spec.file
		end
	end

	return errors, warnings
end

local function validateNoOrphans(specs: { SpecMeta }): ({ string }, { string })
	local errors: { string } = {}
	local warnings: { string } = {}

	-- Build set of all IDs that are referenced by something
	local referenced: { [string]: boolean } = {}
	for _, spec in specs do
		for _, traceId in spec.tracesTo do
			referenced[traceId] = true
		end
	end

	-- Check each spec (except GAME which is the root)
	for _, spec in specs do
		if spec.layer ~= "GAME" and not referenced[spec.id] then
			table.insert(warnings, string.format(
				"[ORPHANED] %s (%s) is never referenced by any other spec",
				spec.id, spec.file
			))
		end
	end

	return errors, warnings
end

--------------------------------------------------------------------------------
-- Public API
--------------------------------------------------------------------------------

function Validator.validateFromTables(specs: { SpecMeta }): ValidationResult
	local allErrors: { string } = {}
	local allWarnings: { string } = {}

	-- Run all validation rules
	local rules = {
		validateTraceResolution,
		validateNoVacuoMechanics,
		validateAssetTraces,
		validateTuningCompleteness,
		validateUniqueIds,
		validateNoOrphans,
	}

	for _, rule in rules do
		local errors, warnings = rule(specs)
		for _, e in errors do table.insert(allErrors, e) end
		for _, w in warnings do table.insert(allWarnings, w) end
	end

	-- Compute stats
	local byLayer: { [string]: number } = {}
	local traceLinks = 0
	for _, spec in specs do
		byLayer[spec.layer] = (byLayer[spec.layer] or 0) + 1
		traceLinks += #spec.tracesTo
	end

	local orphanCount = 0
	for _, w in allWarnings do
		if string.find(w, "%[ORPHANED%]") then
			orphanCount += 1
		end
	end

	return {
		passed = #allErrors == 0,
		errors = allErrors,
		warnings = allWarnings,
		stats = {
			totalSpecs = #specs,
			byLayer = byLayer,
			traceLinks = traceLinks,
			orphaned = orphanCount,
		},
	}
end

function Validator.printReport(result: ValidationResult)
	print("========================================")
	print("  MDA Spec Validation Report")
	print("========================================")
	print("")

	-- Stats
	print(string.format("Total specs: %d", result.stats.totalSpecs))
	for layer, count in result.stats.byLayer do
		print(string.format("  %s: %d", layer, count))
	end
	print(string.format("Trace links: %d", result.stats.traceLinks))
	print(string.format("Orphaned: %d", result.stats.orphaned))
	print("")

	-- Errors
	if #result.errors > 0 then
		print(string.format("ERRORS (%d):", #result.errors))
		for _, e in result.errors do
			print("  " .. e)
		end
		print("")
	end

	-- Warnings
	if #result.warnings > 0 then
		print(string.format("WARNINGS (%d):", #result.warnings))
		for _, w in result.warnings do
			print("  " .. w)
		end
		print("")
	end

	-- Result
	if result.passed then
		print("RESULT: PASSED (no errors)")
	else
		print("RESULT: FAILED (" .. #result.errors .. " errors)")
	end
	print("========================================")
end

return Validator
