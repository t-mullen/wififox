<h1 align="center"> WiFiFox </h1> <br>
<p align="center">
  <a href="https://gitpoint.co/">
    <img alt="GitPoint" title="GitPoint" src="https://user-images.githubusercontent.com/14932492/86988354-0866c800-c166-11ea-9d01-c9abb1be692c.png" width="150">
  </a>
</p>
<p align="center">
A menubar app for bypassing WiFi login pages.
</p>

WiFiFox is a menubar app for bypassing captive portals in wireless networks. It also includes a tiny network scanner. Works in OSX, Windows and Linux.

Please consider [sponsoring this project](https://github.com/sponsors/t-mullen) if this is useful to you.

## Installation
```
npm install -g wififox
```
```
sudo wififox
```


## How it Works
WiFiFox uses MAC spoofing to bypass the portal. It automates the following steps:

1) Discovers other connected clients and their MAC addresses through ping scan or passively.
2) Clones/spoofs these MAC addresses in random order.
3) Checks connection by attempting to reach a known public resource.

## Disclaimer
Only use this software on networks you own or have permission to use.
