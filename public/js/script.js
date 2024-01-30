// document.addEventListener("DOMContentLoaded", async () => {
//     const submitBtn = document.getElementById("submit");
//     const selectedPlaylist = document.getElementById("playlistsList");

//     submitBtn.addEventListener("click", async (e) => {
//         e.preventDefault();
//         const playlistId = JSON.parse(selectedPlaylist.value).id;
//         try {
//             const response = await fetch(`/spotify-tracks?playlistId=${playlistId}`, {
//                 method: "GET",
//                 headers: {
//                     "Content-Type": "application/json",
//                 },
//             });
//             // const data = await response.json();
//             // console.log(data)
//             if(response.ok){
//                 window.location.href = "/spotify-tracks"
//             }
//         } catch (error) {
//             console.error(error);
//         }
//     });
// });
