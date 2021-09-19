/**
 * Logs message to the console
 * @param {string} message - Message
 */
function Log(message: string): void {
  let consoleNode: HTMLElement;

  this.message = message;
  this.warning = function() {

  }
}

export default Log;

new Log().info('hz')
Log.info('hf')