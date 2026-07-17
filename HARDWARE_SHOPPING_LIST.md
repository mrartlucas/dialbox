# 🛠️ Hardware Shopping List — "The Line" Prototype (Phase 1)

Goal: wire a Raspberry Pi to a gutted touch-tone landline phone so you can validate the
software core (IVR, keypad, hook, ringer, message light, audio) with real hardware.
Buy the **Prototype** column first. The **Product/Future** column is only for the
plug-and-play RJ11 box later — don't buy it yet while you're still proving the concept.

> Rough prototype budget: **~$150–$220** (excluding a phone you may already own).

---

## 1. Core compute
| Item | Why | Notes / spec |
|---|---|---|
| **Raspberry Pi 5 (4GB or 8GB)** — or Pi 4 (4GB) if cheaper | Runs Python, Whisper STT, audio mixing, scheduler | Pi 5 recommended for lower TTS/STT latency. 8GB if you want local Whisper models. |
| **Official 27W USB-C PSU (Pi 5)** / 15W (Pi 4) | Stable power — audio glitches if underpowered | Don't cheap out here. |
| **microSD card 32–64GB (A2 rated)** | OS + programs + cached audio | SanDisk Extreme A2 or similar. |
| **Active cooler / heatsink+fan** | Whisper + audio mixing warms the Pi | Official Pi 5 Active Cooler is easiest. |
| (Optional) **microSD → USB reader** | Flash Raspberry Pi OS | Skip if your laptop has an SD slot. |

## 2. Audio (handset in/out)
| Item | Why | Notes |
|---|---|---|
| **USB audio adapter with MIC + SPEAKER (3.5mm)** | Pi has no analog mic input; handset needs both mic (caller) + speaker (playback) | e.g. "Sabrent USB External Stereo Sound Adapter (AU-MMSA)". |
| **Small audio amplifier (PAM8403 board)** *(optional)* | Handset speaker is quiet/low-impedance | Only if handset audio is too soft. |
| **Assorted 3.5mm breakout / screw-terminal jack** | Solder handset mic/speaker wires to the USB adapter | Or cut a 3.5mm cable and wire directly. |

## 3. Hook switch (on/off-hook detection)
| Item | Why | Notes |
|---|---|---|
| **The phone's existing hook switch** | Detects lift/hang-up on a GPIO | Most gutted phones already have this leaf switch under the cradle. |
| **1x 10kΩ resistor** | Pull-up/pull-down for clean GPIO reads | Or use the Pi's internal pull-ups in software. |

## 4. Keypad decoding (DTMF)
| Item | Why | Notes |
|---|---|---|
| **MT8870 DTMF decoder module** | Converts touch-tone key presses → 4-bit digit on GPIO | The heart of "reading" what's dialed on a real phone. Search "MT8870 DTMF decoder module". Buy **2** (they're cheap and easy to fry). |
| **3.5mm / 2-wire pigtail** to tap the phone line audio into the MT8870 | Feed the tone pair into the decoder | |

## 5. Ringer (make the phone ring)
| Item | Why | Notes |
|---|---|---|
| **1-channel 5V relay module (opto-isolated)** | Pi GPIO switches the higher-voltage ringer | Opto-isolated protects the Pi. |
| **Electromechanical bell OR ring-voltage source** | Real phone bells need ~90V AC @ 20Hz — for the prototype it's far safer to drive the phone's **existing internal buzzer/piezo** or a small 5V bell via the relay | ⚠️ Do NOT generate real 90V ring voltage on a breadboard. Use a low-voltage buzzer for the prototype; real ring-voltage generation is a Phase-10 product concern. |
| **5V active buzzer / small bell** | Prototype "ring" indicator | |

## 6. Message-waiting light
| Item | Why | Notes |
|---|---|---|
| **1x LED (red, 5mm) + 220–330Ω resistor** | The "you have voicemail" light | Or reuse the phone's existing message LED if it has one. |

## 7. Wiring / prototyping
| Item | Why |
|---|---|
| **Half-size breadboard** | Wire MT8870, relay, resistors without soldering yet |
| **Jumper wires (M-M, M-F, F-F pack)** | GPIO connections |
| **GPIO breakout / T-Cobbler + ribbon** *(optional but nice)* | Cleaner Pi ↔ breadboard wiring |
| **Soldering iron + solder + helping hands** | For handset mic/speaker + hook switch leads |
| **Multimeter** | Debug continuity / which handset wire is which |
| **Heat-shrink / electrical tape** | Insulate splices |

## 8. The phone itself
| Item | Why | Notes |
|---|---|---|
| **A touch-tone (DTMF) landline phone** | The body you'll gut for the prototype | ⚠️ Must be **touch-tone**, NOT a rotary/pulse-dial phone (MT8870 only decodes DTMF tones). Thrift stores / eBay have cheap Bakelite-style and 80s/90s desk phones. |

---

## ⚠️ Safety notes
- Everything in the **prototype** runs at 3.3V/5V — safe. **Avoid real telephone line voltage (~48V DC) and ring voltage (~90V AC)** until the productization phase; those need proper isolation and are a fire/shock risk on a breadboard.
- The MT8870 wants a clean tone signal — you may need a couple of coupling capacitors/resistors per its datasheet reference schematic (the module usually includes them).

## What NOT to buy yet (Phase 10 — Product box)
- SLIC / FXS interface chip (e.g. Silvertel Ag1171/Ag1170) to generate line voltage, dial tone and ring voltage so **any unmodified phone** plugs into an RJ11 jack.
- RJ11 jack, custom PCB, injection-molded answering-machine enclosure, dedicated message-light lens.
- These make the plug-and-play product — overkill while you're still validating the software/experience.

## Suggested buying order
1. **Prove the software first** (this simulator — done ✅, no hardware needed).
2. Pi 5 + PSU + SD + cooler + USB audio adapter → get audio playing through a handset.
3. Add the hook switch (lift/hang detection).
4. Add the MT8870 → read real dialed digits.
5. Add relay + buzzer (ring) + message LED.
6. Only then consider the productized RJ11 box.
