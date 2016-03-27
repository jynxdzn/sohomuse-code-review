# SohoMuse

Please see documentation files: /docs

Dependencies:

* Nodejs
* NPM
* Mongo
* Redis
* GraphicsMagick

Dev Dependencies:

* Bower
* Grunt

To install NPM packages:

Run this command in the console: npm install

To run:

* Start Mongo
* Start Redis
* Start the web app; run this command in the console: npm start

Authentication:

Most endpoints require authentication, either using cookie (web login) or using an OAuth Bearer Token. OAuth Bearer Tokens are only accepted in "Development" configuration, and the token is equal to the username of the user you wish to authenticate as. Example HTTP header:

	Authorization: Bearer simon