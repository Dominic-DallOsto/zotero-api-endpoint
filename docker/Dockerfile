FROM ubuntu:latest

# install zotero
RUN apt update && apt install -y --no-install-recommends wget sudo bash ca-certificates 
RUN wget https://raw.githubusercontent.com/retorquere/zotero-deb/master/install.sh --no-check-certificate -O - | sh
RUN apt update && apt install -y --no-install-recommends zotero

# install XVFB as a virtual X server, Node, NPM and Newman
RUN apt install -y --no-install-recommends xvfb nodejs npm
RUN npm install -g newman

# add a zotero user
RUN groupadd -g 1000 zotero && useradd -m -g zotero -u 1000 zotero
# add blank Zotero profile
ADD .zotero /home/zotero/.zotero
RUN chown -R zotero /home/zotero/.zotero

USER zotero
WORKDIR /home/zotero
