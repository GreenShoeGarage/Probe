# PROBE — IoT & Embedded Security Workbench

**Version 1.8.0-rc.1 · Green Shoe Garage / Field Instruments**

Observations become evidence.

PROBE is one local-first assessment app with five connected workspaces. A device, its interfaces, firmware, sessions, evidence and findings retain stable identities across the app.

## Start

Choose **Explore sample** for a fictional gateway assessment, or **New assessment** for an empty project. No sample data is silently inserted into a real assessment.

1. In **BOUNDARY**, record the device and scope. Add interfaces and connections. Upload a board photograph, then place markers with the map action or numeric coordinates.
2. In **BOOTTRACE**, choose Serial capture or Debugger. The debugger pairs with the local OpenOCD/GDB companion for registers, memory, symbols and explicit execution control; preserve snapshots and inspect their dumps in FIRMGLASS. For serial, save connection settings, connect a supported serial adapter, or import a log/capture JSON. Review received lines or raw hex records, prepare exact text/hex transmissions, mark events, and export or save a capture snapshot as evidence.
3. In **FIRMGLASS**, inspect up to 32 MiB in a worker, search offsets, review masked candidates, extract supported archives through the isolated companion and compare originals/files. Import CycloneDX or SPDX JSON SBOMs.
4. In **NETWORK**, pair the local companion for scoped TCP/UDP scanning and host discovery, preserve its results, repeat a saved profile and compare observations. The hosted/static edition also imports Nmap XML and PROBE scan JSON.
5. In **ASSESSMENT**, record procedure results, create evidence-linked findings, freeze a baseline and verify changes. Reports are available from the top bar.

## Deployment

The portable ZIP contains `dist/` (the static app), `companion/` (native acquisition), tests and documentation. Upload the **contents of `dist/`**, preserving names, into your static route (for example `/probe/`). Static analysis/imports need no build, npm installation, backend or account. All asset URLs are relative. Native scanning uses the companion below.

Serve over HTTPS for offline caching and Web Serial. For local use, open a terminal in the unpacked `dist/` folder and run:

```sh
python3 -m http.server 8080
```

Then visit `http://localhost:8080/`. Do not double-click `index.html`: JavaScript modules are served through HTTP, and browser security features need an appropriate origin.

In the source checkout, the deployable folder is `dist/`; serve that folder. The source checkout also contains tests and hosting configuration. The private hosted edition adds hosting-provider access control; it does not upload assessment data or sync projects between browsers.

## Native scans

Install **Node.js 22+ and Nmap** on the assessment computer. From the unpacked package root, run:

```sh
node companion/server.mjs --allow 192.168.1.10
```

Replace the example address with your assessment target or allowed CIDR. Without `--allow`, only `127.0.0.1` is allowed. Open the exact `http://127.0.0.1:8844` URL printed by the companion, choose NETWORK → Pair companion, and paste its terminal pairing code. The private hosted app cannot launch your computer's Nmap.

Choose an acquisition mode, numeric targets, ports and collection conditions, review the exact destinations, then start. Preserve the completed job to add original XML plus a hashed acquisition record to your project. Repeat setup never starts automatically. Compare two preserved scans and link both records to a finding.

The candidate has been tested on Linux with a simulated child-process adapter and browser fixtures. **Real Nmap acceptance is outstanding; macOS is unverified and Windows is not implemented.** See `COMPANION.md` for configuration, data recovery and the real-tool bench checklist. No Nmap binary is bundled.

## Data, privacy and recovery

- IndexedDB stores one active project, including original evidence bytes, in the current browser origin.
- The saved-state indicator reports saving, saved and storage failures.
- Export `.probe.json` before switching projects or clearing browser storage. The export includes originals and frozen baselines.
- Import checks the schema, record identities, references and original evidence hashes before replacing the current workspace.
- Native jobs also write original XML, stderr and metadata to `~/.probe/scans` by default (private directory/file permissions). A pairing token lives only in this browser tab’s sessionStorage; it is not part of project exports.
- Preferences are stored in localStorage. No analytics, telemetry, remote fonts, external scripts or vulnerability-database queries run.
- No password or encryption layer is added to browser storage. JSON exports can contain sensitive assessment material. Control access to the browser profile and exports accordingly.
- Raw evidence is preserved. Reports exclude original files and omit raw text excerpts unless explicitly enabled. Finding text and provenance still need review before sharing.
- SHA-256 identifies recorded bytes; it does not establish authorship or authenticity.
- One open editor tab per origin is recommended. Concurrent editing in multiple tabs is not coordinated.

## Offline

After a successful first load over HTTPS or localhost, a versioned service worker caches the application files. The project remains in IndexedDB. Reload from the same origin while offline. The private hosted edition may need an online sign-in; use the portable localhost edition for an isolated bench.

Web Serial still depends on browser support, permission and a physical adapter. Network loss does not itself terminate a local serial connection. Closing the tab does terminate capture.

## Capabilities and limits

| Area | Implemented | Boundary |
|---|---|---|
| Device model | Multiple devices per project; board photos; interfaces; connections; assumptions | No automatic board, pinout or voltage identification |
| Serial | Exact RX and attempted TX records; write outcomes; 7/8 data bits, parity, 1/2 stop bits, flow control; text/hex sends and endings; per-device settings/history; raw and JSON export; complete-line comparison | Release candidate; physical serial acceptance remains outstanding; no control-line toggles, protocol file transfer or native serial adapter |
| Firmware | Worker inspection, offset hex/search/strings, entropy regions, masked review candidates, ZIP/TAR/CPIO/gzip/bzip2/xz and SquashFS extraction, byte/file comparisons | Extraction requires working Linux isolation; no emulation, decompilation, secure-boot or automatic vulnerability verdict |
| Debugger | OpenOCD/GDB MI, explicit controls, registers, bounded flash/RAM reads, ELF symbols, hardware breakpoints; access/read/write watchpoints; enable/ignore controls, hashed snapshots | Candidate ARM profiles; no physical combination validated, MMIO/reset/flash/unlock/arbitrary console excluded |
| Components | CycloneDX / SPDX identity; offline dated OSV imports; append-only applicability reviews | No automatic feed or applicability verdict; ranges remain manual review |
| Network | Local Nmap TCP connect, opt-in UDP and host discovery jobs; explicit allowlist; review/cancel/timeouts; original XML + stderr + metadata; repeat profiles, comparisons and evidence links | Candidate; numeric IPv4 and explicit IPv6 hosts; no DNS/IPv6 CIDRs/NSE options/packet capture; actual Nmap acceptance open |
| Assessment | 12 starter procedures; outcomes; evidence; severity; confidence; remediation; retest | Not an exhaustive methodology or certification |
| Baselines | Frozen device details, interfaces, services, artifact fingerprints, finding states and test statuses | Comparability of conditions is a reviewer decision |
| Reports | In-app document preview; print / Save as PDF | Browser download/print policies apply; raw files excluded |

Input limits: 32 MiB per evidence file, 128 MiB total evidence per project, 8 MiB board photographs. Imported serial logs: up to 10,000 lines. Serial captures stop at 10,000 RX/TX records or 4 MiB recorded bytes, with a 16 MiB project capture budget. Sends are limited to 4,096 bytes. The terminal shows the latest 1,000 matching rows and 4,096 characters per row; original records remain exportable. Project JSON imports accept files under 256 MiB. Firmware strings: printable ASCII of at least 6 characters, at most 5,000 runs, 512 characters each; the view shows up to 500 rows. See `FIRMWARE.md` for extraction and comparison limits.

Nmap imports update matching device/host/protocol/port records and retain other observations. Absence from a later scan is **not** treated as proof that a service closed. Explicit port states in an import are retained. The empty `<!DOCTYPE nmaprun>` declaration emitted by Nmap is accepted; custom/external DTDs and entities are rejected. Native scans expand an aggregate port state only when a successful, matching scan accounts exactly for all remaining requested ports. Port-table guesses remain distinct from probed identities. Incomplete output is preserved without inventing observations.

## Serial capture candidate

This release implements the first serial milestone and retains schema 1 project compatibility. Legacy sessions remain readable; their historical text/hex fields are not relabeled as verified raw captures.

- Configure baud, 7/8 data bits, none/even/odd parity, 1/2 stop bits, none/hardware flow control, and a 256–65,536-byte buffer. The default is 115200 / 8-N-1 / no flow control. Save settings per device; the adapter must support the selected values.
- Text sends are UTF-8 with an explicit none/LF/CR/CRLF ending. Hex sends accept complete byte pairs, with optional whitespace, and append nothing. The outgoing preview shows the byte count and first 48 bytes. Blank text can send only a selected ending.
- RX bytes and TX attempts retain sequence, host timestamp, elapsed host time and direction. TX written means the browser accepted a write, not that the target acknowledged it. Failed/pending writes remain uncertain; no automatic retry, command replay or reconnect occurs.
- Reconnect explicitly through the adapter chooser; each connection starts a new session. Successful command history (last 20 per device) loads drafts only. Commands can contain sensitive values and are saved with the project.
- Text view reconstructs complete RX lines across read boundaries and decodes split UTF-8 characters. It escapes control bytes rather than interpreting terminal control sequences. Logical-line time is the first decoded fragment's host time; use hex records/JSON for original chunk order and interleaving. It is not an ANSI terminal or a wire-timing analyzer.
- The local TX echo checkbox only changes visibility; attempts remain recorded. Search, direction filters, bookmarks, follow/pause and complete received-line comparisons operate on the selected session.
- Capture JSON preserves raw records, settings, adapter identifiers, context, statuses, events and hashes of RX / browser-accepted TX streams. Import verifies those hashes. Save evidence creates a frozen JSON snapshot; later capture does not change it. Raw `.rx.bin` / `.tx.bin` exports concatenate the corresponding bytes; uncertain TX attempts remain only in the capture JSON. If the browser blocks binary downloads, use JSON to retain all bytes.
- Local saving is scheduled about every 750 ms while traffic arrives, and again on close; disk speed/quota can delay it. The save indicator distinguishes pending changes and failures. Abrupt shutdown can lose bytes since the last completed save; reopened active captures are marked interrupted. Known overflow bytes and receive errors are recorded explicitly. Output after a stop or disconnect is not captured.

**Validation:** v1.8.0-rc.1 includes the seven prior follow-on batches and promotes the v1.7/v1.8 feature milestones. Automated checks pass. New interactive browser acceptance is unverified after the browser service timed out; prior v1.5 browser results remain historical. Real Nmap, physical serial/debugger hardware, production extraction isolation and additional OS acceptance remain open. See `VALIDATION.md`, `SERIAL-BENCH.md`, `DEBUGGER-BENCH.md`, `COMPANION.md` and `FIRMWARE.md` for exact scope.

## Debugger and extraction setup

Review an operator profile against the actual target, then launch:

```sh
node companion/server.mjs --allow 127.0.0.1 --debug-profiles ./my-debug-profiles.json
```

`companion/debug-profiles.example.json` is three **unverified** CMSIS-DAP, J-Link and ST-Link / STM32F407VG starting points. Install OpenOCD and ARM-capable GDB locally. Pair at the printed companion URL and open BOOTTRACE → Debugger. The default executable is `arm-none-eabi-gdb`; optional absolute `--gdb` and `--openocd` paths select other installations.

Native extraction additionally requires Linux bubblewrap and Python 3. If isolation is unavailable, extraction stays disabled. Hosted/static PROBE continues to inspect originals and import debugger/extraction records. No native binaries are bundled. See `ROADMAP.md` for stable release gates and later scope.

## Seven follow-on batches (v1.5)

- Companion status/recovery, privacy-conscious diagnostics and a copy-and-verify archive command.
- Native network and extraction acceptance runners; physical serial/debugger and browser-release qualification records in ASSESSMENT. Missing checks and simulations cannot establish a hardware pass.
- ASSESSMENT → Investigation: shared evidence timeline, explicit clock correction/uncertainty, firmware context and immutable evidence bundles. Bundle export includes selected originals; full project JSON is the supported reimport format.
- NETWORK: saved editable scan drafts, revalidated against the active companion allowlist before every run; bounded IPv6 exact hosts, one family per scan.
- BOOTTRACE: visible debugger status refresh and busy controls; J-Link / STM32F407VG is a second unverified profile candidate.
- FIRMGLASS: strict JSON and INI/key=value comparison, SBOM version/license comparison, extracted-child provenance, and a bounded SquashFS pseudo-stream adapter behind mandatory isolation.

All seven software batches are present. This is a release candidate: absent native tools, real physical combinations, sandbox host inspection, actual offline reload and native PDF output are still acceptance gates. `validation/` contains actual blocked native-run reports, not simulated passes.

## Promoted v1.7 / v1.8 milestones

- Native network: UDP requires `--udp enabled` and separately configured Nmap privileges. UDP and discovery are capped at 16 hosts, 16 ports and a 20-probe/s configured ceiling; no service probes. Discovery uses selected TCP connect probes, not a port inventory. `open|filtered` and missing-host uncertainty remain explicit.
- IPv6 link-local addresses require the same interface suffix in the allowlist and target, such as `fe80::1%eth0`. One interface and address family per scan. Interface names belong to the assessment host.
- Debugger: choose access/read/write watches of 1, 2 or 4 aligned bytes; enable/disable and ignore counts for owned hardware stops. Last stop reason and observed stop counts are preserved. No software fallback.
- Firmware: CPIO newc/crc regular files, bounded bzip2/xz streams, metadata-aware file comparisons and strict literal `.env` comparison. Nested payloads require explicit separate inspection.
- Advisory review: FIRMGLASS → Import OSV JSON; import an SBOM first. Preserve source dates/originals, inspect candidate identity/version/ranges, then append a reviewer conclusion with notes and separate assessment evidence. Search/filter candidates; reports include the latest review and source references.

See `ADVISORIES.md` for supported import semantics and `ROADMAP.md` for the revised order.
