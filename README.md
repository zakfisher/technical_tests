# Westfield Front-end Developer Technical Test

## Instructions

Please build out the mockup [found here](https://github.com/westfield/technical_tests/blob/master/design_assets/mockup.png), it's a listing page to display all Westfield centre deals.

The result should:

- Be responsive, you can decide how the design should best scale for smaller screens.
- Be centre aligned in the browser viewport. 960px is the maximum width of the design and 320px is the minimum screen width to support.
- Be the entire contents of the `body` i.e. there is no header/footer.
- Use dynamic data from our API's (see *API/JavaScript* section below), the deals search however should be completely static as we're only interested in the HTML/CSS for this.
- Work in the following desktop browsers and devices (if you don't have access to any devices then testing in an emulator is fine):
	- IE9+.
	- Latest version of all other major browsers.
	- Latest iOS OS devices.
	- Latest Android OS devices.
- Use CSS3 whenever possible and degrade nicely for browsers that do not support advanced features.
- Use Sass CSS pre-processor if possible.
- Use a HTML5 `doctype`.
- Consider high resolution screens i.e. retina.
- Take into account:
	- Accessibility
	- Performance
	- Maintainability

### API/JavaScript

- Use CoffeeScript if you like
- Use any framework / libs
- API docs are here http://www.westfield.com.au/api
- End points of interest:
  - http://www.westfield.com.au/api/centre/master/states.json?country=au
  - http://www.westfield.com.au/api/centre/master/centres.json?state=NSW
  - http://www.westfield.com.au/api/deal/master/deals.json?centre=bondijunction&state=published

----

Fork this repo and create a pull-request when you are done. Good luck. We look forward to receiving your pull-request!