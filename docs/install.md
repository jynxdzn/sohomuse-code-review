# Installation and Running

## Notes

(May need sendmail adding?)

## Server Setup

	sudo apt-get update  

	sudo apt-get install git-core curl build-essential openssl libssl-dev  

	sudo apt-get install git  

	sudo mkdir -p /var/web/sohomuse/www  

	sudo git clone https://bitbucket.org/NavadaDev/soho.git /var/web/sohomuse/www  
		-> [username, password]  

	sudo apt-get install nodejs  

	sudo apt-get install npm  

	cd /var/web/sohomuse/www  

	npm config set registry http://registry.npmjs.org/  

	sudo apt-get install mongodb-clients  

	sudo apt-get install mongodb-server  

	sudo apt-get install redis-server  

	sudo apt-get install graphicsmagick  

	curl https://raw.github.com/creationix/nvm/v0.4.0/install.sh | sh  

	source ~/.nvm/nvm.sh  

	nvm install v0.10.26  

	sudo npm install  

	npm update  

	npm install -g bower  

	bower install --allow-root  

	npm install -g forever  

	sudo npm install -g grunt-cli  


Maybe:

	sudo npm update  

(or on Windows share - because of symlink junction problems)  

	sudo npm install --no-bin-links  

## Single instance:

	npm start  

## Resilient instance, no output, and as a background process:

	forever server.js >/dev/null &  

[Notes- includes instructions for killing...](https://blog.nodejitsu.com/keep-a-nodejs-server-up-with-forever/)

## Sanity Check

JavaScript checks:  
NB This only covers linting a frontend JavaScript files so far...

	grunt dev  

If there are problems with the packages on nvm update, try:

	sudo npm cache clean

## Notes

In Vagrant, some filesystem problems happen between Win host <-> *nix guest, causing a crash on file upload.  
May need an update in controllers/files.js

The version of Node (shown by [nvm current] appears to keep resetting, from 0.10.26 to an earlier version (0.6.x). Not sure why this is!

	nvm use 0.10.26  

and

	nvm update  

seem to get things back on track.
