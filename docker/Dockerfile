FROM ubuntu:latest

# install zotero
RUN apt update && apt install -y --no-install-recommends wget sudo bash ca-certificates 
RUN wget https://downloads.sourceforge.net/project/zotero-deb/install.sh --no-check-certificate -O - | sh
RUN apt update && apt install -y --no-install-recommends zotero

# install XVFB as a virtual X server https://elementalselenium.com/tips/38-headless
RUN apt install -y --no-install-recommends xvfb

# add a zotero user
RUN groupadd -g 1000 zotero && useradd -m -g zotero -u 1000 zotero 
USER zotero
RUN mkdir -p /home/zotero/.zotero
WORKDIR /home/zotero

# add blank Zotero profile
ADD .zotero /home/zotero/.zotero
# add extension (this shouldn't be in here for a proper image) - need to copy the build folder in here
ADD build /home/zotero/build