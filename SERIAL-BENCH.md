# PROBE serial bench acceptance — v1.1.0-rc.1

Status: not yet performed on physical hardware. The delivered release candidate has automated and simulated-browser validation. Record the actual setup and results below before treating the v1.1 hardware milestone as accepted.

## Record the setup

- OS and version:
- Browser and version:
- PROBE origin (HTTPS or localhost) and version:
- Adapter manufacturer/model, USB VID/PID, driver and cable:
- Target model, hardware revision and firmware version/hash:
- Measured interface voltage, pinout, ground and wiring:
- Serial settings and whether hardware flow-control wiring is present:
- Expected control-line/reset behavior when opening the adapter:
- Operator, date, test conditions and evidence identifiers:

## Complete the workflow

1. Export a project backup. Verify wiring and electrical compatibility using the target/adapter documentation and measurements. Use a recoverable bench target.
2. Save its connection settings. Open the adapter and capture a full startup. Mark power-on/reset. Record whether opening caused an unexpected reset or mode change.
3. Use a known target or loopback fixture to receive a binary pattern containing `00`, `FF`, CR/LF and a UTF-8 multibyte sequence. Compare the exact expected bytes with the raw RX export or capture JSON. Do not rely only on displayed text.
4. Send `A` with none, LF, CR and CRLF endings. Verify target-side bytes are respectively `41`, `41 0A`, `41 0D`, `41 0D 0A`. Send hex `00 FF 0D 0A` and verify no extra terminator. Confirm an incomplete hex byte is rejected.
5. Record whether the browser reports successful writes independently of target acknowledgment. Interrupt a transmission where the setup permits it; verify its attempted bytes are retained and its outcome is marked uncertain, without automatic retry.
6. Capture sustained output at the intended baud. Confirm the save indicator updates during traffic. Exercise the 4 MiB or 10,000-record limit; verify explicit termination, retained prefix and reported dropped bytes. Device/driver overruns may lose data before PROBE can count it; independently compare the source fixture.
7. Unplug during capture. Confirm the retained session remains visible and exportable. Reconnect deliberately; verify a new session and that no history entry or failed command is automatically sent.
8. Save a capture as evidence and continue work; confirm the earlier evidence snapshot remains unchanged. Export capture JSON and project JSON, reopen/import them, and verify byte hashes, settings, events, write statuses and evidence links.
9. Refresh/reopen with a saved session. Confirm it persists. In a controlled interruption test, confirm an unfinished session is marked interrupted rather than still connected; account for the autosave interval.
10. Compare two startup sessions around a known firmware/configuration change. Confirm complete RX lines are compared independently of read-chunk boundaries. Review gaps and collection conditions before drawing a conclusion.
11. Verify the portable app on localhost and with an actual offline reload. Verify report preview and native Save as PDF. Test raw downloads under the intended browser policy; capture JSON is the alternative for preserving bytes.

## Record the outcome

| Check | Pass / fail / not tested | Evidence and limitations |
|---|---|---|
| Connection and startup | Not tested | |
| Binary RX/TX fidelity | Not tested | |
| Endings and invalid-input handling | Not tested | |
| Sustained traffic and limits | Not tested | |
| Failed write and unplug/reconnect | Not tested | |
| Save/export/import/recovery | Not tested | |
| Comparison and evidence snapshot | Not tested | |
| Offline and report output | Not tested | |

Do not generalize a passing setup to untested adapters, electrical interfaces, driver versions or targets. Record the supported matrix when acceptance is complete. Manual control-line tools and the local companion are separate planned work.
