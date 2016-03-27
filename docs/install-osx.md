# Installation (OS X)

## Install Homebrew (package manager)

Run the following command:

	ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)"

## Install Dependencies

Run the following command, at the root of the project:

	brew bundle

## Install NPM Dependencies

Run the following command, at the root of the project:

	npm install

## Install Development Dependencies (optional)

Run the following commands to install developer tools:

	npm install -g bower
	npm install -g grunt-cli

# Running

Start Redis using the following command:

	redis-server

Start MongoDB using the following command (uses the default configuration file):

	mongod --config /usr/local/etc/mongod.conf

Start the app using the following command:

	npm start