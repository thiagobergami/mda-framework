--[[
	MDALogger — Structured Runtime Logging for MDA Spec-Driven Development
	Spec: MEC-003

	Every log entry follows the pattern:
	[MM:SS.mmm] [LAYER:SPEC_ID] [LEVEL] [EVENT_TYPE] key=value key=value ...

	Usage:
		local Log = require(path.to.MDALogger)

		-- Basic event logging
		Log.info("M", "MEC-001", "DISCOVERY", { spot = "kitchen_cabinet", time = 25.8 })

		-- Correlated event chain
		local cid = Log.correlate()
		Log.info("M", "MEC-001", "DISCOVERY", { spot = "kitchen", time = 25.8 }, cid)
		Log.info("M", "MEC-002", "EXPRESSION", { emotion = "Giggle" }, cid)
		Log.info("D", "DYN-001", "FEEDBACK", { loop = "DiscoveryAssistance" }, cid)

		-- Invariant checking
		Log.checkInvariant("DYN-001", "INV-1", discoveryTime < 50, "discovery in " .. discoveryTime .. "s < 50s cap")

		-- Proxy checking
		Log.checkProxy("AES-001", "discovery_rate", medianTime, 25, 10)

		-- Session summary
		Log.summary()
]]

local MDALogger = {}

--------------------------------------------------------------------------------
-- Log Levels
--------------------------------------------------------------------------------

export type LogLevel = number

MDALogger.Level = {
	TRACE = 1,
	DEBUG = 2,
	INFO  = 3,
	WARN  = 4,
	ERROR = 5,
	NONE  = 99,
}

-- PASS/FAIL are logged at INFO/ERROR level respectively but carry their own label
local LEVEL_NAMES = {
	[1] = "TRACE",
	[2] = "DEBUG",
	[3] = "INFO",
	[4] = "WARN",
	[5] = "ERROR",
}

--------------------------------------------------------------------------------
-- Configuration
--------------------------------------------------------------------------------

local config = {
	minLevel = MDALogger.Level.INFO,
	bufferMaxSize = 2000,
	enabled = true,
	printToOutput = true,
}

--------------------------------------------------------------------------------
-- Internal State
--------------------------------------------------------------------------------

local sessionStart: number = os.clock()
local correlationCounter: number = 0
local sessionBuffer: { string } = {}
local bufferIndex: number = 0

-- Tracked metrics for session summary
local trackedMetrics: {
	[string]: {           -- keyed by "SPEC_ID:metric_name"
		values: { number },
		target: number?,
		tolerance: number?,
		proxyName: string,
		specId: string,
	}
} = {}

-- Invariant results
local invariantResults: {
	[string]: {           -- keyed by "SPEC_ID:INV_ID"
		passed: number,
		failed: number,
		lastDetail: string,
	}
} = {}

--------------------------------------------------------------------------------
-- Formatting Helpers
--------------------------------------------------------------------------------

local function formatTimestamp(): string
	local elapsed = os.clock() - sessionStart
	local minutes = math.floor(elapsed / 60)
	local seconds = elapsed % 60
	return string.format("%02d:%06.3f", minutes, seconds)
end

local function formatData(data: { [string]: any }?, correlationId: number?): string
	if not data and not correlationId then
		return ""
	end

	local parts: { string } = {}

	if correlationId then
		table.insert(parts, "cid=" .. tostring(correlationId))
	end

	if data then
		-- Sort keys for consistent output (AI can rely on deterministic ordering)
		local keys: { string } = {}
		for k in data do
			table.insert(keys, k)
		end
		table.sort(keys)

		for _, k in keys do
			local v = data[k]
			local formatted: string

			if type(v) == "number" then
				-- Format with reasonable precision
				if v == math.floor(v) then
					formatted = tostring(v)
				else
					formatted = string.format("%.3f", v)
				end
			elseif type(v) == "boolean" then
				formatted = tostring(v)
			elseif type(v) == "string" then
				-- Quote strings that contain spaces
				if string.find(v, " ") then
					formatted = '"' .. v .. '"'
				else
					formatted = v
				end
			else
				formatted = tostring(v)
			end

			table.insert(parts, k .. "=" .. formatted)
		end
	end

	return table.concat(parts, " ")
end

local function formatEntry(
	layer: string,
	specId: string,
	levelLabel: string,
	eventType: string,
	data: { [string]: any }?,
	correlationId: number?
): string
	local timestamp = formatTimestamp()
	local dataStr = formatData(data, correlationId)

	if dataStr == "" then
		return string.format("[%s] [%s:%s] [%s] [%s]", timestamp, layer, specId, levelLabel, eventType)
	end

	return string.format("[%s] [%s:%s] [%s] [%s] %s", timestamp, layer, specId, levelLabel, eventType, dataStr)
end

--------------------------------------------------------------------------------
-- Buffer Management
--------------------------------------------------------------------------------

local function addToBuffer(entry: string)
	bufferIndex += 1

	-- Ring buffer: overwrite oldest when full
	local index = ((bufferIndex - 1) % config.bufferMaxSize) + 1
	sessionBuffer[index] = entry
end

local function emit(entry: string, level: number)
	addToBuffer(entry)

	if not config.printToOutput then
		return
	end

	if level >= MDALogger.Level.ERROR then
		-- Use warn() not error() — error() halts execution in Roblox
		warn("[MDA-ERROR] " .. entry)
	elseif level >= MDALogger.Level.WARN then
		warn(entry)
	else
		print(entry)
	end
end

--------------------------------------------------------------------------------
-- Core Logging API
--------------------------------------------------------------------------------

function MDALogger.log(
	layer: string,
	specId: string,
	level: LogLevel,
	eventType: string,
	data: { [string]: any }?,
	correlationId: number?
)
	-- Short-circuit if disabled or below threshold (Rule 6: no perf impact)
	if not config.enabled or level < config.minLevel then
		return
	end

	local levelName = LEVEL_NAMES[level] or "UNKNOWN"
	local entry = formatEntry(layer, specId, levelName, eventType, data, correlationId)
	emit(entry, level)
end

-- Convenience methods for each level

function MDALogger.trace(layer: string, specId: string, eventType: string, data: { [string]: any }?, cid: number?)
	MDALogger.log(layer, specId, MDALogger.Level.TRACE, eventType, data, cid)
end

function MDALogger.debug(layer: string, specId: string, eventType: string, data: { [string]: any }?, cid: number?)
	MDALogger.log(layer, specId, MDALogger.Level.DEBUG, eventType, data, cid)
end

function MDALogger.info(layer: string, specId: string, eventType: string, data: { [string]: any }?, cid: number?)
	MDALogger.log(layer, specId, MDALogger.Level.INFO, eventType, data, cid)
end

function MDALogger.warn(layer: string, specId: string, eventType: string, data: { [string]: any }?, cid: number?)
	MDALogger.log(layer, specId, MDALogger.Level.WARN, eventType, data, cid)
end

function MDALogger.err(layer: string, specId: string, eventType: string, data: { [string]: any }?, cid: number?)
	MDALogger.log(layer, specId, MDALogger.Level.ERROR, eventType, data, cid)
end

--------------------------------------------------------------------------------
-- Correlation IDs
--------------------------------------------------------------------------------

function MDALogger.correlate(): number
	correlationCounter += 1
	return correlationCounter
end

--------------------------------------------------------------------------------
-- Invariant Checking
--------------------------------------------------------------------------------

function MDALogger.checkInvariant(
	specId: string,
	invariantId: string,
	condition: boolean,
	detail: string?,
	correlationId: number?
)
	local key = specId .. ":" .. invariantId
	local record = invariantResults[key]
	if not record then
		record = { passed = 0, failed = 0, lastDetail = "" }
		invariantResults[key] = record
	end

	local detailStr = detail or ""

	if condition then
		record.passed += 1
		record.lastDetail = detailStr

		if config.enabled and MDALogger.Level.INFO >= config.minLevel then
			local entry = formatEntry("D", specId, "PASS", "INVARIANT", {
				inv = invariantId,
				detail = detailStr,
			}, correlationId)
			emit(entry, MDALogger.Level.INFO)
		end
	else
		record.failed += 1
		record.lastDetail = detailStr

		-- Invariant failures ALWAYS log, even at higher filter levels
		local entry = formatEntry("D", specId, "FAIL", "INVARIANT", {
			inv = invariantId,
			detail = detailStr,
		}, correlationId)
		emit(entry, MDALogger.Level.ERROR)
	end
end

--------------------------------------------------------------------------------
-- Metric Tracking & Proxy Validation
--------------------------------------------------------------------------------

function MDALogger.trackMetric(specId: string, proxyName: string, value: number, target: number?, tolerance: number?)
	local key = specId .. ":" .. proxyName
	local record = trackedMetrics[key]
	if not record then
		record = {
			values = {},
			target = target,
			tolerance = tolerance,
			proxyName = proxyName,
			specId = specId,
		}
		trackedMetrics[key] = record
	end

	table.insert(record.values, value)

	-- Update target/tolerance if provided (may be set on first call)
	if target then record.target = target end
	if tolerance then record.tolerance = tolerance end
end

function MDALogger.checkProxy(
	specId: string,
	proxyName: string,
	value: number,
	target: number,
	tolerance: number,
	correlationId: number?
)
	local diff = math.abs(value - target)
	local status: string

	if diff <= tolerance then
		status = "IN_RANGE"
	elseif diff <= tolerance * 1.5 then
		status = "DRIFTING"
	else
		status = "OUT_OF_RANGE"
	end

	local data = {
		proxy = proxyName,
		value = value,
		target = target,
		tolerance = tolerance,
		status = status,
	}

	if status == "IN_RANGE" then
		if config.enabled and MDALogger.Level.INFO >= config.minLevel then
			local entry = formatEntry("A", specId, "PASS", "PROXY_CHECK", data, correlationId)
			emit(entry, MDALogger.Level.INFO)
		end
	elseif status == "DRIFTING" then
		local entry = formatEntry("A", specId, "WARN", "PROXY_CHECK", data, correlationId)
		emit(entry, MDALogger.Level.WARN)
	else
		local entry = formatEntry("A", specId, "FAIL", "PROXY_CHECK", data, correlationId)
		emit(entry, MDALogger.Level.ERROR)
	end
end

--------------------------------------------------------------------------------
-- Session Summary
--------------------------------------------------------------------------------

local function computeMedian(values: { number }): number
	if #values == 0 then return 0 end

	local sorted = table.clone(values)
	table.sort(sorted)

	local mid = math.floor(#sorted / 2)
	if #sorted % 2 == 0 then
		return (sorted[mid] + sorted[mid + 1]) / 2
	else
		return sorted[mid + 1]
	end
end

function MDALogger.summary()
	local elapsed = os.clock() - sessionStart

	-- Log session overview
	MDALogger.info("A", "SESSION", "SUMMARY_START", {
		duration = elapsed,
		totalEntries = math.min(bufferIndex, config.bufferMaxSize),
		correlations = correlationCounter,
	})

	-- Log all tracked metric summaries
	for _, record in trackedMetrics do
		local median = computeMedian(record.values)
		local min = math.huge
		local max = -math.huge
		for _, v in record.values do
			if v < min then min = v end
			if v > max then max = v end
		end

		MDALogger.info("A", record.specId, "METRIC_SUMMARY", {
			proxy = record.proxyName,
			count = #record.values,
			median = median,
			min = min,
			max = max,
		})

		-- Auto-check against target if configured
		if record.target and record.tolerance then
			MDALogger.checkProxy(record.specId, record.proxyName, median, record.target, record.tolerance)
		end
	end

	-- Log invariant summary per spec
	local specInvariants: { [string]: { passed: number, failed: number } } = {}
	for key, record in invariantResults do
		local specId = string.split(key, ":")[1]
		local summary = specInvariants[specId]
		if not summary then
			summary = { passed = 0, failed = 0 }
			specInvariants[specId] = summary
		end
		summary.passed += record.passed
		summary.failed += record.failed
	end

	for specId, summary in specInvariants do
		local level = if summary.failed > 0 then "FAIL" else "PASS"
		local entry = formatEntry("D", specId, level, "INVARIANT_SUMMARY", {
			passed = summary.passed,
			failed = summary.failed,
		})
		emit(entry, if summary.failed > 0 then MDALogger.Level.ERROR else MDALogger.Level.INFO)
	end

	MDALogger.info("A", "SESSION", "SUMMARY_END", {})
end

--------------------------------------------------------------------------------
-- Configuration API
--------------------------------------------------------------------------------

function MDALogger.setLevel(level: LogLevel)
	config.minLevel = level
end

function MDALogger.enable()
	config.enabled = true
end

function MDALogger.disable()
	config.enabled = false
end

function MDALogger.setBufferSize(size: number)
	config.bufferMaxSize = math.max(100, size)
end

function MDALogger.setPrintToOutput(enabled: boolean)
	config.printToOutput = enabled
end

--------------------------------------------------------------------------------
-- Utilities
--------------------------------------------------------------------------------

function MDALogger.reset()
	sessionStart = os.clock()
	correlationCounter = 0
	sessionBuffer = {}
	bufferIndex = 0
	trackedMetrics = {}
	invariantResults = {}
end

function MDALogger.getBuffer(): { string }
	-- Return entries in chronological order
	if bufferIndex <= config.bufferMaxSize then
		return table.clone(sessionBuffer)
	end

	-- Ring buffer: reconstruct order
	local result: { string } = {}
	local startIdx = (bufferIndex % config.bufferMaxSize) + 1
	for i = startIdx, config.bufferMaxSize do
		table.insert(result, sessionBuffer[i])
	end
	for i = 1, startIdx - 1 do
		table.insert(result, sessionBuffer[i])
	end
	return result
end

function MDALogger.getBufferFiltered(filter: string): { string }
	local result: { string } = {}
	for _, entry in MDALogger.getBuffer() do
		if string.find(entry, filter, 1, true) then
			table.insert(result, entry)
		end
	end
	return result
end

function MDALogger.getInvariantResults(): { [string]: { passed: number, failed: number, lastDetail: string } }
	return table.clone(invariantResults)
end

return MDALogger
