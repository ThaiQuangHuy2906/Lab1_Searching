export interface LatestRequestGuard {
  begin: () => number;
  isCurrent: (token: number) => boolean;
}

export function createLatestRequestGuard(): LatestRequestGuard {
  let latest = 0;
  return {
    begin: () => {
      latest += 1;
      return latest;
    },
    isCurrent: (token) => token === latest,
  };
}
