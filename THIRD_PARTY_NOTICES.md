# Third-party notices

StrideOS source code is distributed under the repository's MIT License. Dependencies keep their own licenses.

## Garmin FIT JavaScript SDK

- Package: `@garmin/fitsdk`
- Publisher: Garmin International, Inc.
- Purpose: decode FIT activity files selected by the athlete
- Source: <https://github.com/garmin/fit-javascript-sdk>
- Package documentation: <https://developer.garmin.com/fit/get-the-sdk/>
- License: the Garmin SDK license distributed in the installed package as `LICENSE.txt`

The Garmin FIT SDK license does not grant StrideOS permission to redistribute the SDK. This repository therefore contains no copy of the SDK or its source. `npm install` or `npm ci` downloads Garmin's official `@garmin/fitsdk` package and its `LICENSE.txt`; use is governed by Garmin's license, not this repository's MIT License.
