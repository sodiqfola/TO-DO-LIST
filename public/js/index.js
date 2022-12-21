//jshint esversion:8

const modal = document.getElementById("myModal");
const btn = document.querySelector(".bx-menu");

var span = document.getElementsByClassName("close-button")[0];

btn.addEventListener("click", function () {
  modal.classList.add("show-modal");
});

span.addEventListener("click", function () {
  modal.classList.remove("show-modal");
});
