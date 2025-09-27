function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function onData(from, to, data) {
  if (data.length >= 12) {
    var functionCode = data[7];
    var time = new Date().toTimeString().split(' ')[0];

    // Function Code 6: Write Single Holding Register - ALLOW ALL
    if (functionCode == 6) {
      var regAddr = (data[8] << 8) | data[9];
      var regValue = (data[10] << 8) | data[11];

      // Log register writes for visibility and allow them
      log("┌─[" + time + "]─[REGISTER WRITE]────");
      log("│ Direction: " + (from.indexOf(".11") !== -1 ? "HMI → PLC" : "PLC → HMI"));
      log("│ Register Address: " + regAddr);
      log("│ Value: " + regValue + " (0x" + pad(regValue.toString(16), 4) + ")");
      log("│ [+] ACTION: ALLOWED - Passing through");
      log("└───────────────────────────────────");

      // Return original data packet to allow the operation
      return data;
    }

    // Function Code 5: Write Single Coil - BLOCK ALL
    else if (functionCode == 5) {
      var coilAddr = (data[8] << 8) | data[9];
      var coilValue = (data[10] << 8) | data[11];

      log("╔═══[" + time + "]═══[COIL WRITE INTERCEPTED]═══╗");
      log("║ Direction: " + (from.indexOf(".11") !== -1 ? "HMI → PLC" : "PLC → HMI"));
      log("║ Source: " + from);
      log("║ Function Code: 5 (Write Single Coil)");
      log("║ Coil Address: " + coilAddr);
      log("║ Original Value: " + (coilValue == 0xFF00 ? "ON (0xFF00)" : "OFF (0x0000)"));
      log("╠══════════════════════════════════════════════════╣");
      log("║ [+] ACTION: BLOCKING - Dropping packet          ║");
      log("╚══════════════════════════════════════════════════╝");

      // Return nothing (or null) to drop the packet and block the operation
      return;
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
log("╔══════════════════════════════════════════════════╗");
log("║         COIL WRITE BLOCKER ACTIVE                ║");
log("╠══════════════════════════════════════════════════╣");
log("║ Configuration:                                   ║");
log("║ • Blocking ALL coil writes (FC5).                ║");
log("║ • Allowing ALL holding register writes (FC6).    ║");
log("║ • Allowing ALL read operations.                  ║");
log("╠══════════════════════════════════════════════════╣");
log("║ Target: 192.168.1.120 (PLC)                      ║");
log("║ Source: 192.168.1.11 (HMI)                       ║");
log("╚══════════════════════════════════════════════════╝");
log("");
log("Monitoring Modbus traffic...");