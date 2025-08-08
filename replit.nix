{ pkgs }: {
  deps = [
    pkgs.nodePackages_latest.pnpm
    pkgs.nodejs_latest
    pkgs.lsof
  ];
}
