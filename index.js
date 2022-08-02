const express = require("express");
const request = require("request");
const imageToBase64 = require("image-to-base64");
const cors = require("cors");

const PORT = 1234;

const app = express();
app.listen(PORT, () => {
  console.clear();
  console.log(`Listing in http://localhost:${PORT}`);
});

app.use(cors());

const getBase64 = async (link) => {
  const base64 = await imageToBase64(link);
  return `data:image/jpeg;base64,${base64}`;
};

app.get("/", (req, res) => {
  res?.send("I am working.");
});

app.get("/post/:id", (req, res) => {
  const { id } = req?.params;
  if (id) {
    const link = `https://www.instagram.com/p/${id}/?__a=1`;
    request(link, (err, response, html) => {
      if (!err) {
        const json = JSON.parse(html)?.graphql?.shortcode_media;
        const promiseArray = json?.edge_sidecar_to_children?.edges?.map(
          async (item) => ({
            displayUrl: await getBase64(item?.node?.display_url),
            resolutions: item?.node?.display_resources?.map((item) => ({
              src: item?.src,
              size: item?.config_width,
            })),
          })
        );
        let allImages;
        if (promiseArray) allImages = Promise.all(promiseArray);
        if (json) {
          (async () => {
            res?.send({
              id,
              mainContent: {
                displayUrl: await getBase64(json?.display_url),
                resolutions: json?.display_resources.map((item) => ({
                  src: item?.src,
                })),
              },
              user: {
                username: json?.owner?.username,
                isVerified: json?.owner?.is_verified,
                fullName: json?.owner?.full_name,
                profilePic: await getBase64(json?.owner?.profile_pic_url),
              },
              caption: {
                main: json?.edge_media_to_caption.edges[0]?.node.text,
                accessibile: json?.accessibility_caption,
              },
              location: json?.location,
              comments: json?.edge_media_to_parent_comment?.count,
              likes: json?.edge_media_preview_like?.count,
              isVideo: json?.is_video,
              videoUrl: json?.video_url,
              allImages: await allImages,
            });
          })();
        }
        if (!json) res?.status?.send("error");
      }
    });
  }
});
app.get("/user/:username", (req, res) => {
  const { username } = req?.params;
  if (username) {
    const link = `https://www.instagram.com/${username}/?__a=1`;
    request(link, (err, response, html) => {
      if (!err) {
        const json = JSON.parse(html)?.graphql?.user;
        const promiseArray = json?.edge_owner_to_timeline_media?.edges?.map(
          async (item) => ({
            displayUrl: await getBase64(item?.node?.display_url),
            id: item?.node?.shortcode,
            location: item?.node?.location,
            caption: {
              main: item?.node?.edge_media_to_caption.edges[0].node.text,
              accessibile: item?.node?.accessibility_caption,
            },
            comments: item?.node?.edge_media_to_comment.count,
            isVideo: item?.node?.is_video,
            likes: item?.node?.edge_liked_by.count,
            isCollection: item?.node?.edge_sidecar_to_children ? true : false,
            resolutions: item?.node?.thumbnail_resources,
          })
        );
        let allImages;
        if (promiseArray) allImages = Promise.all(promiseArray);
        if (json)
          (async () => {
            res?.send({
              username,
              bio: json.biography,
              isVerified: json?.is_verified,
              category: json?.category_name,
              externalURL: json?.external_url,
              profilePic: {
                sd: await getBase64(json?.profile_pic_url),
                hd: await getBase64(json?.profile_pic_url_hd),
              },
              fullName: json?.full_name,
              following: json?.edge_followed_by.count,
              follows: json?.edge_follow.count,
              posts: {
                total: json?.edge_owner_to_timeline_media?.count,
                content: await allImages,
              },
            });
          })();
        if (!json) res?.status(400).send("ERROR");
      }
    });
  }
  if (!username) res?.send(`Error`);
});