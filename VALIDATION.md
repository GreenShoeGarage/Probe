# PROBE 1.8.0-rc.1 validation

The v1.7 and v1.8 software milestones are implemented ahead of stable qualification and recipes. Automated validation is recorded below. Native and physical gates remain open.

## v1.8 release validation

The final portable package is checked with the full 81-test Node suite. The first full-package run exposed a 500 ms simulated debugger startup deadline under concurrent test load; healthy-fixture deadlines were increased to 2 seconds while explicit hang/unplug tests retain 500 ms. Production debugger timeouts remain unchanged. New coverage includes UDP opt-in/limits and authenticated API originals, discovery absence semantics, exact-interface IPv6, hardware-only watch modes and configuration, strict CPIO paths/checksums/links/truncation, bounded bzip2/xz expansion, permission-only differences, literal .env rejection/masking, package identity, dated advisory matching and review integrity. An advisory-controller integration test exercises original import, duplicate rejection, evidence-required conclusions, append-only history, finding evidence links, report rendering and JSON roundtrip. This is controller validation, not a browser interaction test.

The actual prior browser-exported assessment was validated under the new model: 25 original evidence sizes/SHA-256 hashes verified, two frozen bundles retained and empty advisory collections added.

Managed preview started and displayed the landing page. The browser service failed during the first import attempt; subsequent tab/reset requests timed out. New interactive flows, visual/mobile review, live offline reload and native PDF are therefore **unverified in this release**. Existing preview code was not modified to bypass the failed service. No new browser screenshot is claimed.

The sections below preserve historical v1.5 acceptance evidence. They do not qualify new v1.7/v1.8 workflows.

## Historical v1.5 automated coverage

The suite now contains 66 tests covering core/serial/network/debugger regressions plus diagnostics redaction, non-destructive archive integrity/lock/link checks, missing-tool bench reports, qualification semantics, frozen context and bundle integrity, IPv6 canonicalization/allowlist bounds, saved profile migration, strict configuration/SBOM comparisons (including numeric precision and duplicate-key rejection), child provenance and synthetic SquashFS pseudo streams. The offline unit test covers all 24 required resources and API cache exclusion. A new-project migration mismatch (missing empty scanProfiles collection) was found and fixed; the targeted regression passes. The extracted portable ZIP is the final full-suite verification target.

## Historical v1.5 browser acceptance

The managed static preview was exercised with the prior v1.4 assessment retained:

- Context annotation records collection time, +1,000 ms correction, ±2,000 ms uncertainty and a firmware hash without changing original bytes.
- Two frozen bundles preserve selected originals/context. Their comparison labels membership differences without inferring target removal or remediation.
- A physical serial qualification record defaults to not-run and remains **Pending**, including after project reimport.
- A named IPv6 scan draft saves and survives project export/import; no actual network traffic was sent from browser QA.
- Two JSON configuration originals compare diagnostics true→false, port 8080→443 and a changed password masked in the comparison. The comparison is saved as evidence.
- Inspecting a file from an imported extraction creates a child artifact with source/manifest/path/hash provenance.
- An actual browser-exported project contains 25 evidence originals, two bundles, one time context, one bench record, one saved profile, one structured comparison and one child provenance chain. All 25 original sizes and SHA-256 hashes were independently verified; the exported project passes model validation and reimports through the shipping UI.
- Report preview includes frozen bundle hashes and omits raw excerpts by default; the synthetic configuration secret is absent from the default report.
- Four browser XML assertions cover IPv6 compressed/canonical equivalence, complete coverage, aggregate closed state and out-of-profile rejection.
- A clearly labeled simulated debugger UI verifies automatic refresh to running state, last-reported timestamps and disabled operation controls while busy. It is not a hardware test.
- Desktop and 390-pixel Investigation layouts were visually inspected. Companion setup/archive guidance was checked. Disposable QA pages are excluded from deployment and packaging.

## Actual native attempts and open gates

`validation/native-network.json` and `validation/native-network-ipv6.json` record actual blocked acceptance attempts: Nmap is absent. `validation/native-extraction.json` records an actual isolation probe timeout. Reports retain the version at time of collection. No genuine native scan or successful production extraction is claimed.

OpenOCD, ARM GDB, unsquashfs and physical serial/debugger hardware are unavailable. CMSIS-DAP and J-Link profiles remain unverified. SquashFS parser fixtures are synthetic pseudo streams; native decompressor integration, malformed-image acceptance, namespace/mount inspection and termination/resource enforcement require the intended Linux host. The adapter fails closed behind isolation; no unrestricted fallback exists.

Actual service-worker offline reload remains unverified on this HTTP preview. Native Save as PDF and authenticated private-hosted UI acceptance remain open. Prior release validations below retain their historical scope and counts.

---

# PROBE 1.4.0-rc.1 validation

## Current release candidate

The combined suite contains **51 automated tests**. Final package validation runs that suite from an extracted portable ZIP with Node.js 24.22.1 and Python 3.12.14. Coverage includes existing core/serial/network behavior plus GDB/MI parsing, simulated OpenOCD/GDB processes, authenticated debugger API, stopped-state enforcement, bounded memory, hardware-only breakpoints, symbols, timeout/unplug recovery, record/dump hashes, firmware offset/search/comparison semantics, schema migration and controlled ZIP/TAR/gzip reader fixtures. Offline cache tests cover all 16 static resources.

The archive parser fixtures are generated synthetic inputs: safe files, traversal, links, duplicate normalized paths, excessive entries and oversized members. They run the reader directly for deterministic parser checks. Production extraction is guarded by bubblewrap and is **not exercised successfully in this environment**; its isolation probe fails/times out and native extraction refuses to start. Sandbox probe cleanup closes streams and terminates its owned process group. There is no unrestricted production fallback.

Browser QA on the managed static preview verified:

- Existing schema 1 assessment loads with serial sessions, scans, evidence and baseline intact.
- Firmware review masks a synthetic sensitive assignment, gives its exact offset across a 64 KiB boundary, opens the containing hex row and finds an exact component string.
- Two firmware artifacts compare as positional changed ranges; the comparison is saved as evidence.
- A 32 MiB synthetic image finishes worker analysis and persists. The boundary is tested with an actual file, not an advertised browser capacity estimate. Analysis uses bounded in-memory buffers; arbitrary-size streaming is not claimed.
- Matching-source extraction JSON imports, validates file hashes, lists files and masks a synthetic configuration secret in preview.
- A protocol-test-generated debugger JSON imports, preserves a 64-byte memory dump and displays historical registers/events. The same dump becomes a FIRMGLASS artifact without changing its original evidence.
- Debugger controls exercised with an explicitly labeled UI fixture: refresh, resume confirmation, running state, bounded memory form, detach confirmation and final unknown state/disabled controls. Backend state restrictions and API envelopes have separate child-process/HTTP tests.
- A browser export contains 20 evidence items, six firmware artifacts (including the 32 MiB original and debugger dump), one debugger snapshot, two scans, three serial sessions and one frozen baseline. Every evidence size/SHA-256, debugger record/dump and extracted file hash was independently verified. The same file successfully reimports through the shipping app.
- Report preview includes debugger, extraction and comparison evidence, with raw excerpts off by default. The synthetic secret is absent from that default report.
- Desktop and 390-pixel firmware layouts were inspected. Mobile tab spacing was increased; tables and hex data can scroll within their containers. Browser QA fixtures are excluded from deployment and the portable ZIP.

A scan cancellation test initially depended on a fixed startup delay. It now waits for observed XML/stderr progress before cancellation; the corrected cancellation and authenticated debugger API checks pass. The full portable-package suite is the final regression gate.

## Unverified release gates

No actual Nmap, OpenOCD/GDB target session, physical serial adapter, CMSIS-DAP board or production bubblewrap extraction succeeds here. Tool integration and parser simulations are not hardware compatibility evidence. macOS native-tool acceptance remains open; Windows native companion is unsupported. The HTTP preview cannot demonstrate a real browser service-worker offline reload; the automated test verifies cache coverage/fallback. Native PDF output and authenticated hosted UI acceptance are also outstanding.

See `SERIAL-BENCH.md`, `COMPANION.md`, `DEBUGGER-BENCH.md`, `FIRMWARE.md` and `ROADMAP.md` for reproducible bench gates. Historical sections below describe their own release scope and counts.

# Earlier milestone validation

## Native scanning candidate

All 33 automated tests pass. The suite exercises actual local HTTP requests and spawned test processes on Linux / Node.js 24.22.1. The adapter is explicitly a simulator, not Nmap. Tests cover allowlist enforcement, canonical IPv4 and argument validation, bounded workloads, origin/Host/authentication rejection, no source-file serving, output hashes, a controlled loopback TCP service changing from open to closed, process-group cancellation (including a child ignoring SIGTERM), timeout, output caps, missing tools, nonzero exits, interrupted-record recovery and comparison semantics. Existing serial/core/offline regressions pass.

Browser QA uses the disposable `tests/network-browser-fixture.mjs` harness, excluded from deployment and the ZIP. Eight rendered XML parser checks cover the ordinary empty Nmap DOCTYPE, explicit observations, service identification method, exact aggregate closed-port expansion, mismatched coverage, unsuccessful scans, external DTD rejection and malformed XML. The UI was exercised through pairing, profile setup, exact-destination review, running status, evidence preservation, repeated setup and before/after comparison.

The actual browser-downloaded project contained two scan records, six evidence items and a retained baseline. Every evidence SHA-256 and the original XML/stderr hashes were independently verified. The simulated scan pair records open → closed and labels the change from port-table identification to aggregate state. Both acquisition records were then imported through the shipping app’s file picker and persisted across reload. A combined export independently verified all 12 evidence hashes, both scan envelopes, three retained serial sessions and the existing baseline. Comparison-to-finding selected both acquisition records. Desktop and 390-pixel mobile layouts were inspected; wide tables retain horizontal scrolling. The static edition’s local setup guidance was verified.

**Real-tool boundary:** Nmap was not installed. Package installation was unavailable in the execution environment. No genuine Nmap run, physical IoT target, macOS run or native debugger session is claimed. Complete the real-Nmap checklist in `COMPANION.md`; this remains a release candidate. Linux process handling is tested. Windows is deliberately rejected by the companion. Actual service-worker browser offline reload remains unverified on this HTTP preview; the automated cache test covers all eleven static resources and simulated offline fallback.

## Serial milestone additions

24 automated tests pass: the previous 11 checks plus 13 serial tests using real JavaScript readable/writable streams and an injected in-memory port. Serial coverage includes exact endings and binary sends, split UTF-8 and CRLF, final decoder flush, binary preservation through project JSON, transmit success/uncertainty, concurrent-send rejection, cancellation of pending writes, unplug, recoverable/fatal receive errors, capture byte/record limits, interrupted-state recovery and malformed capture rejection. These tests do not emulate an OS driver or physical electrical interface.

Browser QA used an explicitly labeled disposable simulated-port page generated by `node tests/browser-fixture.mjs`. It verified a 115200 / 8-E-2 connection, single-byte boot reads, a multibyte UTF-8 character, exact `00 FF 0D 0A` transmit, text with CRLF, 150 successive heartbeat lines, an event marker during capture, a failed write, unplug recovery, per-device settings after reload and history that loads drafts without transmitting. The simulator is excluded from the deployed app and portable package.

An actual browser-downloaded capture JSON was independently verified with Node's SHA-256 implementation: 199 records, 2,038 RX bytes, 12 browser-accepted TX bytes and 6 uncertain TX bytes. The uncertain bytes were excluded from the accepted-TX hash. The capture was imported through the actual app's file picker and its complete received lines were compared with a legacy session.

A new evidence snapshot and full project export were verified: eight original evidence hashes, capture hashes, the snapshot reference and two existing legacy sessions survived. Browser project reimport restored the capture. The serial composer and export controls were visually checked at desktop and a 390-pixel mobile width; dark-theme warning/timestamp contrast was adjusted after inspection.

Raw binary download did not complete in the cloud browser. Byte generation is covered by tests and all bytes are preserved in the successfully downloaded capture JSON; native `.rx.bin` / `.tx.bin` downloads require acceptance in the intended browser. No physical serial target was available. `SERIAL-BENCH.md` records the outstanding release gate. Native serial control-line tools and expanded firmware analysis were not included in that serial milestone. The v1.2 companion is network-only.

## Previous integrated-workflow validation (v1.0.1)

## Automated checks

The original 11 checks remain passing under Node.js. Coverage includes independent SHA-256 comparison at padding boundaries, export/import and evidence hashes, immutable baseline comparisons, cross-device comparison rejection, scan merge behavior, unsafe import rejection, firmware observations, SBOM normalization, empty projects, HTML escaping, and service-worker offline fallback with a simulated unavailable network. That release cached nine required resources. The v1.2 cache test covers eleven, including both network modules.

## Browser acceptance

Performed in the provided Chromium browser against the static preview:

- Cold start offers an empty assessment or an explicitly selected fictional sample.
- Sample loads all five workspaces with connected evidence and device context.
- Device firmware edits persist and appear as baseline changes.
- Nmap XML fixture updates explicit port state and version without duplicating the inventory.
- Firmware fixture produces expected ELF identification, SHA-256, size, entropy and readable strings.
- CycloneDX fixture produces the expected component and license.
- Imported serial log preserves the original and distinguishes import timestamps.
- Before/after log comparison identifies the changed firmware and diagnostic-service lines.
- Finding edits retain old and new evidence links and support a documented resolved state.
- Guided retest results update coverage.
- JSON download validated independently: all six evidence artifacts hash correctly, links and baseline are preserved.
- Fresh Start creates an empty project; interface creation and linked observation capture work.
- Reimport of the browser-exported project restores the previous assessment after evidence verification.
- Report preview renders findings, procedures, assumptions, interfaces, services, firmware/components, connections, evidence and baselines without raw originals.
- Dark theme and Advanced mode persist after reload; acquisition metadata appears in Advanced mode.
- The layout was inspected at desktop width and in a 390-pixel phone viewport. A mobile toolbar overflow was corrected.

## Verification boundaries

- No physical serial adapter or embedded target was available. Live connect/read/write/disconnect requires bench acceptance on the intended browser and hardware.
- The HTTP preview is not a secure context: actual service-worker installation and browser offline reload cannot be established there. Offline caching behavior was tested with simulated network failure; use HTTPS or localhost for field acceptance.
- Report content and the in-app document preview were verified. The print action populated the print-only report. Native Save as PDF output depends on the user’s browser print dialog; no PDF file was produced by the cloud browser.
- The private deployment succeeded. The browser reached its ChatGPT sign-in gate but had no authenticated session, so authenticated hosted acceptance and an actual offline browser reload remain unverified.
- No external targets were scanned. All assessment fixtures are fictional and use documentation IP addresses.
