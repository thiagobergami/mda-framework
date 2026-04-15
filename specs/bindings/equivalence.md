# Engine Equivalence Table

Cross-engine mapping of MDA framework concepts to engine-specific implementations.
Use this as a quick reference when writing binding specs or porting between engines.

## Scene Graph

| MDA Concept | Roblox | Unity | Unreal |
|-------------|--------|-------|--------|
| World container | Workspace | Scene | World/Level |
| Game object | Instance (Part, Model) | GameObject | Actor |
| Component | N/A (properties on Instance) | MonoBehaviour | ActorComponent |
| Hierarchy parent | Instance.Parent | Transform.parent | AttachToActor |
| Prefab / template | Asset in ServerStorage | Prefab | Blueprint |

## Services & Subsystems

| MDA Concept | Roblox | Unity | Unreal |
|-------------|--------|-------|--------|
| Physics | Workspace (physics engine) | Physics / Rigidbody | UPhysicsEngine / UPrimitiveComponent |
| Input | UserInputService / ContextActionService | Input System | Enhanced Input System |
| Audio | SoundService / Sound instances | AudioSource / AudioListener | UAudioComponent / MetaSounds |
| UI framework | ScreenGui / SurfaceGui | Canvas / UI Toolkit | UMG / Slate |
| Scheduling | RunService (Heartbeat, Stepped) | MonoBehaviour (Update, FixedUpdate) | Tick / Timers |
| Networking | RemoteEvent / RemoteFunction | Netcode for GameObjects / Mirror | Replication / RPCs |
| Storage | DataStoreService | PlayerPrefs / custom backend | SaveGame / custom backend |
| Tags / markers | CollectionService tags | Tags / Layers | Gameplay Tags |
| Attributes | Instance:GetAttribute() | Serialized fields | UProperty / metadata |

## Scripting

| MDA Concept | Roblox | Unity | Unreal |
|-------------|--------|-------|--------|
| Language | Luau | C# | C++ / Blueprint |
| Script attachment | Script parented to Instance | MonoBehaviour on GameObject | ActorComponent on Actor |
| Module system | ModuleScript (require) | Assembly / namespace | Module / #include |
| Coroutines | task.spawn / task.wait | Coroutines (IEnumerator) | Latent Actions / async |
| Type system | Luau type annotations | C# static types | C++ static types |

## Asset Pipeline

| MDA Concept | Roblox | Unity | Unreal |
|-------------|--------|-------|--------|
| 3D model import | MeshPart / Upload | FBX/glTF import | FBX/glTF import |
| Material | SurfaceAppearance / MaterialVariant | Material / Shader | Material / Shader |
| Animation | AnimationController / Animator | Animator / Animation | AnimBP / Montage |
| Particle effects | ParticleEmitter | Particle System / VFX Graph | Niagara / Cascade |
| Sound effects | Sound instance | AudioClip | USoundWave |

## Networking Model

| MDA Concept | Roblox | Unity | Unreal |
|-------------|--------|-------|--------|
| Authority | Server-authoritative (always) | Configurable (server/host/client) | Server-authoritative (default) |
| Client → Server | RemoteEvent:FireServer() | ServerRpc / Command | Server RPC |
| Server → Client | RemoteEvent:FireClient() | ClientRpc / TargetRpc | Client RPC / Multicast |
| State replication | Value objects / Attributes | NetworkVariable / SyncVar | Replicated properties |
| Ownership | N/A (server owns all) | NetworkObject.OwnerClientId | Owner / Authority |

## Event System

| MDA Concept | Roblox | Unity | Unreal |
|-------------|--------|-------|--------|
| Custom events | BindableEvent / Signal pattern | C# events / UnityEvent | Delegates / Event Dispatchers |
| Collision | Touched / GetTouchingParts | OnCollisionEnter | OnComponentHit |
| Trigger zones | Touched (CanCollide=false) | OnTriggerEnter | OnComponentBeginOverlap |
| Player join/leave | Players.PlayerAdded | NetworkManager callbacks | GameMode::PostLogin |

---

*When writing a binding spec, use this table to find the engine equivalent of each MDA concept,
then detail the specific implementation in the binding spec's sections.*
