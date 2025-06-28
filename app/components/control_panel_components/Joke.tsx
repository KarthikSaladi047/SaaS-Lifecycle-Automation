"use client";

import React, { useEffect, useState } from "react";

const Joke = () => {
  const [joke, setJoke] = useState<string>("Loading a joke...");

  const fetchJoke = async () => {
    try {
      const res = await fetch("https://icanhazdadjoke.com/", {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to fetch joke");

      const data = await res.json();
      setJoke(data.joke);
    } catch (error) {
      setJoke(`Oops! Couldn't fetch a joke right now. Error:${error}`);
    }
  };

  useEffect(() => {
    fetchJoke();
  }, []);

  return (
    <div className="bg-yellow-50 p-6 rounded-xl shadow-lg max-w-xl mx-auto text-center space-y-4 border border-yellow-200">
      <h1 className="text-2xl font-extrabold text-yellow-800">😂 Joke Zone</h1>
      <p className="text-gray-700 italic">{joke}</p>
      <button
        onClick={fetchJoke}
        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full transition duration-300 ease-in-out shadow"
      >
        Tell me another!
      </button>
    </div>
  );
};

export default Joke;
