//jshint esversion:8

const modal = document.getElementById("myModal");
const btn = document.querySelector(".bx-menu");

const span = document.getElementsByClassName("close-button")[0];

btn.addEventListener("click", function () {
  modal.classList.add("show-modal");
});

span.addEventListener("click", function () {
  modal.classList.remove("show-modal");
});

const logout = document.getElementById("log");
const dot = document.querySelector(".bx-dots-vertical-rounded");

const closes = document.querySelector(".exit");

dot.addEventListener("click", function () {
  logout.classList.add("show-logout");
});

closes.addEventListener("click", function () {
  logout.classList.remove("show-logout");
});
