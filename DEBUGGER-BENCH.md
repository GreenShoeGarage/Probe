# Debugger integration — v1.4.0-rc.1

## Status and setup

The implementation is validated with simulated OpenOCD/GDB child processes and the authenticated HTTP API. **No physical probe/target/tool combination is certified or validated by this release.** The supplied CMSIS-DAP / STM32F407VG profile is a candidate, not automatic board detection.

Install OpenOCD and an ARM-capable GDB on the assessment computer. Review `companion/debug-profiles.example.json` against the exact board datasheet, memory map, measured pinout/logic level, probe and installed OpenOCD configuration scripts. Copy it to your operator profile file and adjust only for the actual target. Then:

```sh
node companion/server.mjs --allow 127.0.0.1 --debug-profiles ./my-debug-profiles.json
```

Optional `--openocd /absolute/path` and `--gdb /absolute/path` select local executables. Default GDB is `arm-none-eabi-gdb`. Native binaries are not bundled. Open the exact local URL printed by the companion, pair the browser in NETWORK or BOOTTRACE, select **BOOTTRACE → Debugger → Refresh debugger**, then attach with recorded conditions. Native scanning is optional; a missing Nmap binary does not disable debugger imports or installed debugger tools.

## Behavior and limits

- ARM SWD/JTAG profiles only, 10–4,000 kHz, up to 16 configured profiles. All remain labeled unverified; preserve independent bench evidence separately.
- OpenOCD GDB listener binds loopback on a chosen ephemeral port. Tcl/telnet listeners are disabled. PROBE issues no reset, flash or unlock command. Installed target/adapter scripts are trusted operator configuration and can themselves affect the target on initialization or attach.
- GDB uses MI2, no init files, automatic file loading disabled and debuginfod disabled. There is no arbitrary console or expression endpoint. Symbols are ELF files up to 8 MiB; exact hash and filename are recorded. Matching symbols remain the operator's responsibility.
- Halt/resume/instruction-step/detach require explicit UI actions. Attach can halt/reset depending on the target scripts. Detach can resume. State after detach, crash, timeout, unplug or companion interruption is unknown.
- Reads must remain inside declared flash/RAM regions below `0x40000000`; MMIO is excluded. Up to 1 MiB per read, 8 MiB of dumps per session. Partial/discontinuous reads are rejected as complete dumps, with the response retained in the transcript.
- Hardware execution breakpoints and access/read/write watchpoints of 1, 2 or 4 bytes, aligned to their width. No software-breakpoint fallback. Unsupported operations return the tool error. Hardware slots and watchpoint support depend on the target.
- Registers: first 64 named registers. Backtrace: up to 32 frames. Neither proves valid stack unwinding without appropriate symbols, ABI and stopped state.
- Ten retained native sessions; 8 MiB raw transcript, 20,000 transcript chunks and 5,000 structured events per session. Raw transcript cap closes the session. Event list is bounded; original transcript retains commands/responses within its cap.
- The companion saves session metadata and raw transcript after operations/state transitions. A hard crash may lose recent data since the last completed write. Restart marks connected sessions interrupted and never reconnects or replays commands.
- Refresh reads stored companion state; **Read state** queries GDB. Asynchronous target changes require refresh; the backend enforces the actual known stopped state before inspection/control operations.

Preserve snapshots before and after meaningful operations. Project snapshots retain hashes, exact memory bytes, acquisition context and transcript. **FIRMGLASS → Inspect dump** analyzes the same memory evidence without replacing it. Portable debugger JSON imports validate the record hash and every dump; hashes establish byte consistency, not the collector's identity. Export before archiving the stopped companion's evidence directory.

## Physical acceptance record — outstanding

Record OS/kernel, OpenOCD/GDB versions, probe model/firmware/serial, board revision, MCU marking, target firmware hash, exact scripts and profile, measured voltage/pinout, reset wiring and power arrangement.

On a recoverable reference board:

1. Independently establish expected attach effects. Confirm no unexpected reset, flash change or listener exposure.
2. Attach; read known registers and a small known RAM/flash pattern. Compare the dump against an independent tool and SHA-256.
3. Halt, resume, step, hit/remove a hardware breakpoint and test an aligned watchpoint. Verify real hardware resource exhaustion yields an explicit error.
4. Load matching ELF symbols and inspect the backtrace. Try a mismatched file and record interpretation limits.
5. Unplug the probe, stop a tool and interrupt the companion. Confirm retained evidence and unknown target state. Reconnect deliberately without command replay.
6. Preserve/export/import a session, inspect its memory in FIRMGLASS and attach the resulting evidence to a finding/retest.

References: [OpenOCD with GDB](https://openocd.org/doc/html/GDB-and-OpenOCD.html), [GDB MI](https://sourceware.org/gdb/current/onlinedocs/gdb.html/GDB_002fMI.html). Validate against documentation matching the installed versions.

## v1.5 candidate matrix and status display

The example profiles now include CMSIS-DAP, J-Link and ST-Link against STM32F407VG flash/RAM regions. Both are unverified candidates, not a supported-hardware matrix. The second profile uses the upstream `interface/jlink.cfg` adapter configuration; exact probe firmware, OpenOCD scripts, wiring and target effects must still be qualified. See [OpenOCD adapter configuration](https://openocd.org/doc/html/Debug-Adapter-Configuration.html).

While the debugger view is visible, paired local status refreshes about every two seconds, pauses for dialogs/operations, and labels target state as last reported. This status refresh does not issue target execution commands. Read state explicitly when required; a displayed stopped/running state is not a guarantee that the target has not changed since the last observation. The API enforces one operation at a time, and UI busy state is exposed. No automatic reconnect or command replay occurs.

Record physical results in ASSESSMENT → Qualification with exact hardware/tool conditions and evidence. Simulation-only or missing steps remain pending.

## v1.7 hardware stop and third-probe gate

Hardware stops can be enabled/disabled and configured to ignore the next 0–1,000,000 hits while the target is stopped. Only stops owned by the current session are eligible. PROBE records stop reason, frame/address and received hit notifications; these counts are not a hardware trace. Write watches are accepted only after GDB confirms `hw watchpoint`; rejected software fallbacks are removed. Test every mode/width, unsupported read-watch behavior, slot exhaustion, enable/disable, ignore counts, actual hit notifications, detach and disconnect on the intended combination.

`stlink-stm32f407vg` uses `interface/stlink.cfg` with `dapdirect_swd` and the same STM32F407VG target/memory assumptions as the other candidates. It is an unverified reference, not a compatibility claim. Review adapter voltage, wiring, board variant and installed OpenOCD scripts before any connection. Each physical combination needs its own recorded bench evidence.
