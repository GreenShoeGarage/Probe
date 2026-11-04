# Seven-batch implementation record

Requested sequence: readiness → real network acceptance → physical debugger/serial acceptance → extraction/release qualification → connected investigations → network/debugger expansion → deeper firmware comparison.

| Batch | State | Evidence / remaining gate |
|---|---|---|
| 1 | Implemented; targeted tests pass | Companion status, redacted diagnostics, shared token refresh, verified non-destructive archive. Archive rejects live directories/links and verifies copied bytes. |
| 2 | Acceptance runner implemented; real run blocked | `companion/network-bench.mjs`; `validation/native-network.json` records absent Nmap. The runner controls a loopback HTTP listener, saves actual scan envelopes and checks state change, service probes, allowlist and cancellation. |
| 3 | Recording workflow implemented; physical execution blocked | ASSESSMENT → Qualification records each required observation, exact hardware/tool context and evidence. Missing checks/context and simulations cannot establish a physical pass. No probe/adapter is attached here. |
| 4 | Implemented; production run blocked | Native extraction runner preserves controlled fixtures/results; isolation probe timed out (`validation/native-extraction.json`). Browser release checklist added. Parser fixtures pass; actual offline/PDF remain host gates. |
| 5 | Implemented; targeted tests pass | Unified evidence timeline, clock corrections/uncertainty, firmware context, frozen bundles and original-inclusive export; cross-device and altered-original checks. |
| 6 | Implemented; native/hardware gates open | Named reusable scan drafts, exact-host IPv6 allowlists, canonical XML handling, two-second visible debugger status, busy state and J-Link candidate profile. IPv6 real-tool run blocked by missing Nmap. |
| 7 | Implemented; native SquashFS gate open | Isolated bounded pseudo-stream adapter (no archive path writes), strict JSON/INI comparisons, SBOM version/license diffs, parent/manifest/child provenance. Synthetic parser tests pass; unsquashfs unavailable. |

A blocked acceptance gate is not a successful test or a validated hardware claim. Software work continues in the requested order; stable release qualification remains contingent on actual bench evidence.

## Promoted milestones, v1.8.0-rc.1

After the seven historical batches, the user moved v1.7 and v1.8 next. Implementation was sequential:

| Milestone | Implemented | Evidence / open acceptance |
|---|---|---|
| v1.7 | Bounded UDP opt-in, host discovery, exact-interface IPv6; hardware watch modes/widths, enable/ignore and stop notifications; unverified ST-Link reference | Policy, simulated authenticated API/child-process and debugger fixture tests. No actual Nmap/probe qualification. |
| v1.8 | Strict CPIO, bzip2/xz readers; file metadata and literal .env comparisons; component identities and dated offline OSV review | Controlled archive/malformed inputs, review controller/original/hash/project roundtrip tests. Actual isolation and new browser interaction acceptance remain open. |

Stable qualification and device-specific v1.6 recipes follow these promoted features. No intervening stable release or hardware compatibility is implied.
