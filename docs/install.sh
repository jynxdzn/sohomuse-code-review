#!/bin/bash

if (( $# != 3 )); then
    echo "Illegal number of parameters"
    exit 0;
fi

apt-get -y update &&
apt-get -y install git-core git curl build-essential openssl libssl-dev &&
mkdir -p $1 &&
git clone https://$2:$3@bitbucket.org/NavadaDev/soho.git $1 &&
mkdir -p $1/logs &&
apt-get -y install nodejs-legacy npm &&
cd $1 &&
npm config set registry http://registry.npmjs.org/ &&
apt-get -y install mongodb-clients mongodb-server redis-server graphicsmagick &&
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.25.3/install.sh | bash &&
source ~/.nvm/nvm.sh && 
nvm install v0.10.26 && 
npm update && 
npm install -g bower forever grunt-cli && 
bower install --allow-root --config.interactive=false && 
npm update
