type Log = {
  message: string;
}

/**
 * Logs message to the console
 * @param {Log} this - Log constructor
 * @param {string} message - Message
 */
function Log(this: Log, message: string): void {
  let consoleNode: HTMLElement;

  this.message = message;
}

export default Log;
