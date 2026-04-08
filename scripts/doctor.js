const { runDoctor } = require('../platform/cli/doctor');

(async () => {
  try {
    await runDoctor();
  } catch (error) {
    // runDoctor prints its own formatted output; keep this minimal.
    process.exitCode = 1;
  }
})();