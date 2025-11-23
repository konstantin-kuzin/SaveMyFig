import { Logger } from './logger';

export type LatestReleaseInfo = {
  version: string | null;
  url?: string;
  publishedAt?: string;
  error?: string;
};

export type UpdateCheckResult = {
  currentVersion: string;
  latestVersion: string | null;
  isOutdated: boolean;
  url?: string;
  publishedAt?: string;
  error?: string;
};

/**
 * Small helper for comparing local app version with the latest GitHub release.
 */
export class UpdatesChecker {
  private readonly repo: string;
  private readonly logger?: Logger;

  constructor(repo: string, logger?: Logger) {
    this.repo = repo;
    this.logger = logger;
  }

  async checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
    const latest = await this.fetchLatestReleaseInfo();
    const latestVersion = latest.version;
    const isOutdated = latestVersion
      ? this.isVersionOlder(currentVersion, latestVersion)
      : false;

    return {
      currentVersion,
      latestVersion,
      isOutdated,
      url: latest.url ?? this.getReleasesPageUrl(),
      publishedAt: latest.publishedAt,
      error: latest.error
    };
  }

  private getReleasesPageUrl(): string {
    return `https://github.com/${this.repo}/releases`;
  }

  private normalizeVersion(version: string): string {
    return version.trim().replace(/^v/i, '');
  }

  private parseVersionParts(version: string): number[] {
    return this.normalizeVersion(version)
      .split('.')
      .map(part => {
        const num = parseInt(part, 10);
        return Number.isFinite(num) ? num : 0;
      });
  }

  private isVersionOlder(currentVersion: string, latestVersion: string): boolean {
    const currentParts = this.parseVersionParts(currentVersion);
    const latestParts = this.parseVersionParts(latestVersion);
    const maxLength = Math.max(currentParts.length, latestParts.length);

    for (let i = 0; i < maxLength; i++) {
      const current = currentParts[i] ?? 0;
      const latest = latestParts[i] ?? 0;

      if (current < latest) return true;
      if (current > latest) return false;
    }

    return false;
  }

  private async fetchLatestReleaseInfo(): Promise<LatestReleaseInfo> {
    const endpoint = `https://api.github.com/repos/${this.repo}/releases/latest`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'SaveMyFig/UpdateCheck',
          'Accept': 'application/vnd.github+json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const message = `GitHub responded with ${response.status}`;
        this.logger?.warn(message);
        return { version: null, error: message };
      }

      const data = await response.json();
      const rawVersion = data?.tag_name || data?.name || null;
      const version = rawVersion ? this.normalizeVersion(rawVersion) : null;
      const url = data?.html_url || this.getReleasesPageUrl();
      const publishedAt = data?.published_at;

      if (!version) {
        const message = 'Latest release version not found in GitHub response';
        this.logger?.warn(message);
        return { version: null, url, publishedAt, error: message };
      }

      return { version, url, publishedAt };
    } catch (error: any) {
      const message = error?.name === 'AbortError'
        ? 'Update check aborted due to timeout'
        : error?.message || 'Failed to fetch latest release info';
      this.logger?.warn(message);
      return { version: null, error: message };
    } finally {
      clearTimeout(timeout);
    }
  }
}
