import axios from 'axios';

const BUNNY_STREAM_API_KEY = '2274031d-fefa-423d-9d1a7aff737c-6202-483e';
const BUNNY_STREAM_LIBRARY_ID = '430910';

// Updated function to get video details including URLs
export const uploadVideoToStreamLibrary = async (videoBuffer: Buffer, title?: string) => {
     try {
          // First, create a video entry
          const createResponse = await axios.post(
               `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`,
               {
                    title: title || 'Uploaded Video',
               },
               {
                    headers: {
                         'AccessKey': BUNNY_STREAM_API_KEY,
                         'Content-Type': 'application/json',
                    },
               },
          );

          const videoId = createResponse.data.guid;
          console.log('Video created with ID:', videoId);

          // Upload the video file
          await axios.put(`https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`, videoBuffer, {
               headers: {
                    'AccessKey': BUNNY_STREAM_API_KEY,
                    'Content-Type': 'application/octet-stream',
               },
          });

          // Get video details with URLs after upload
          const videoDetailsResponse = await axios.get(
               `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
               {
                    headers: {
                         'AccessKey': BUNNY_STREAM_API_KEY,
                    },
               }
          );

          const videoData = videoDetailsResponse.data;
          
          return {
               success: true,
               videoId: videoId,
               urls: {
                    // Direct play URL
                    playUrl: `https://iframe.mediadelivery.net/play/${BUNNY_STREAM_LIBRARY_ID}/${videoId}`,
                    // Embed URL for iframe
                    embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoId}`,
                    // Thumbnail URL (if available)
                    thumbnailUrl: videoData.thumbnailFileName ? 
                         `https://vz-${BUNNY_STREAM_LIBRARY_ID}.b-cdn.net/${videoId}/${videoData.thumbnailFileName}` : null,
                    // HLS streaming URL
                    hlsUrl: `https://vz-${BUNNY_STREAM_LIBRARY_ID}.b-cdn.net/${videoId}/playlist.m3u8`
               },
               videoDetails: videoData,
          };
     } catch (error: any) {
          console.error('Upload failed:', error.response?.data || error.message);
          throw error;
     }
};