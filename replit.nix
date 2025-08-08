{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.lsof
    pkgs.nodePackages.pnpm
  ];
}
