"use client"

import Authorization from "@/components/Authorization";
import { samplePrivateFunction, samplePublicFunction } from "@/lib/functions";
import { useCallback } from "react";

export default function PublicPage() {
  const onPublicButtonClick = useCallback(async () => {
    const response = await samplePublicFunction();
    alert(response);
  }, []);

  const onPrivateButtonClick = useCallback(async () => {
    const response = await samplePrivateFunction();
    alert(response);
  }, []);

  return (
    <Authorization>
      <div className="w-full">
        <h1 className="text-center font-bold py-8 text-2xl">Public Page</h1>

        <div className="text-center py-8">
          <button className="font-bold rounded-lg text-lg px-8 py-2 mx-2 bg-[#3160aa] hover:bg-[#3160aa]/90 text-[#ffffff] justify-center" onClick={() => onPublicButtonClick()}>
            Public Button
          </button>

          <button className="font-bold rounded-lg text-lg px-8 py-2 mx-2 bg-[#3160aa] hover:bg-[#3160aa]/90 text-[#ffffff] justify-center" onClick={() => onPrivateButtonClick()}>
            Private Button
          </button>
        </div>
      </div>
    </Authorization>
  );
}