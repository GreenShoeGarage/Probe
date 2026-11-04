# PROBE roadmap — v1.8.0-rc.1

The requested v1.7 and v1.8 feature work has been promoted ahead of remaining stable-release qualification and v1.6 recipes. Both milestones ship together in this feature release candidate. Version order records delivered scope, not hardware certification.

| Order | Milestone | Current state | Completion gate |
|---|---|---|---|
| Delivered foundation | v1.0–v1.4 | Integrated device/evidence model, serial, firmware inspection, native TCP and OpenOCD/GDB integration | Physical/native acceptance still open |
| Delivered foundation | v1.5 follow-on batches | Recovery/readiness, qualification records, connected investigations, frozen bundles, saved IPv6 drafts, SquashFS and structured comparisons | Prior real-tool runs blocked; no stable promotion |
| Promoted, implemented | v1.7 network/debugger depth | Opt-in bounded UDP, TCP-probe host discovery, scoped link-local IPv6, hardware watch modes/widths, enable/ignore controls, observed stop records and ST-Link candidate | Actual Nmap modes and each physical probe/target combination; new browser interaction acceptance |
| Promoted, implemented | v1.8 firmware depth | CPIO newc/crc, bzip2/xz streams, metadata comparisons, literal .env diff, richer component identities, dated OSV import and evidence-backed applicability review | Actual isolated readers/resource enforcement; new browser review/import/report/offline/PDF acceptance |
| Next | Qualification and stable release | Run the existing native/physical procedures plus new v1.7/v1.8 cases on the intended host | Preserve actual tool versions, original results, recovery/cancellation checks and field assessment roundtrip |
| Following | v1.6 device recipes, rescheduled | Device-specific repeatable acquisition/retest recipes and setup presets | Base workflows qualified first; recipe conditions and evidence requirements explicit |
| Later, uncommitted | Further analysis adapters | UBI/UBIFS, richer configuration semantics and vendor-specific advisory mapping | Separate bounded adapter designs and fixtures |

## Immediate acceptance batches

1. Browser: new scan-profile modes; advisory import/review/history/search; legacy and new project roundtrip; report/PDF and offline cache; desktop/mobile/keyboard/theme checks. The browser service timed out during this release, so these new interactive flows are unverified.
2. Network: real Nmap TCP/UDP/discovery, exact-interface IPv6 and privilege errors; uncertainty, limits, original output, cancellation and restart recovery. Existing TCP bench success would not qualify the new modes automatically.
3. Debugger/serial: physical CMSIS-DAP, J-Link and ST-Link combinations separately; actual watch modes/widths, ignore/enable, stop notifications, unsupported resources, detach/unplug; serial capture and reconnect checks.
4. Firmware: actual Linux isolation, CPIO and compressed-stream malformed/expansion limits, SquashFS integration, metadata comparisons and extraction-child provenance.
5. One complete field assessment: acquisition → linked evidence → advisory review → finding → retest bundle → JSON transfer → reviewed report. Promote a stable version only after recorded acceptance.

Firmware execution/emulation, arbitrary debugger commands, flash programming, protection changes, unrestricted scanning and multiuser collaboration remain outside this release.
