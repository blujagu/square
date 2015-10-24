# JATO
"Jet Assisted Take Off" for Modern Application Development

## What is JATO?
JATO is an application framework written in JavaScript that gets your project off the ground with lightning speed. The first thing that should excite you about the JATO framework is the tiny footprint.  JATO unminified is smaller than any other comparable minified framework!  Plus, JATO provides a true MVC architecture which uses eventing rather than digest loops, HTML that validates, AJAX calls returns Promises, and the model supports both relational and non-relational approaches to storing and retrieving data.

## What about performance?
To compare a framework with a jet implies awesome power and speed.  JATO lives up to it's name by offering compact, powerful functions and using native JavaScript methodology "under the hood" as much as possible. Most frameworks waste operations on extraneous function calls, looping mechanisms, and costly DOM lookups.  JATO gets the job done using optimized code structures, multiple caching mechanisms, and best of all... you should never need to do a DOM lookup in JATO.  Rather, JATO caches DOM nodes you care about as properties of the view object which makes retrieval fast and easy.  Speaking of fast and easy, the view knows how to tear itself down and it cleans up all associated event handlers as it implodes.  This brings up another good point which is that JATO is not only fast in terms of applications speed, it also results in rapid architecture and development.

## This framework is in Alpha
Look for daily refinements :)
Contribution instructions, license, and other stuff will be added... eventually.

## Updates
### 10/21/2015
While trying to create the most useful and efficient model API possible, I created this test on jsPerf: http://jsperf.com/iteration-race/2
Based on these results, relational data stores in JavaScript are up to 60% faster than data collections, yet no one stores data this way on the client...
until now.  Take a look at the lib/SQLish.js API as it's reaching a whole new level of WOW!  The SQLish tests show implementation coolness in test/SQLishTests.js.

<a name="patreon"></a>
## Support JATO on Patreon

![patreon](http://www.blujagu.com/images/patreon.png)

Please help support the future development of JATO through our [Patreon campaign](https://www.patreon.com/blujagu). I have exciting plans and there's so much I'd love to do. If we all work together, JATO will be an amazing resource.