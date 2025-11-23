class CleanListReporter {
  constructor() {
    this.counter = 0;
  }

  onTestEnd(test, result) {
    this.counter += 1;

    const statusSymbol = this.getStatusSymbol(result.status);
    const projectTag = result.project?.name ? `[${result.project.name}]` : '';

    // Remove script path + strip "project:" / "file:" prefixes from titles
    const titleParts = test.titlePath()
      .slice(1) // drop script path portion
      .map(part => part.replace(/^project:\s*/i, '').replace(/^file:\s*/i, '').trim())
      .filter(Boolean)
      .join(' › ');

    const duration = this.formatDuration(result.duration);
    const line = `${statusSymbol} ${this.counter} ${projectTag ? `${projectTag} › ` : ''}${titleParts} (${duration})`;
    console.log(line);
  }

  getStatusSymbol(status) {
    if (status === 'passed') return '✓';
    if (status === 'skipped') return '○';
    if (status === 'flaky') return '±';
    return '✗';
  }

  formatDuration(durationMs) {
    const seconds = (durationMs / 1000).toFixed(1);
    return `${seconds}s`;
  }
}

module.exports = CleanListReporter;
