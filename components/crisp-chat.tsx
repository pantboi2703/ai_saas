"use client"

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export const CrispChat = () => {
    useEffect(() => {
        Crisp.configure 
        ("09eca78e-0eb7-4420-aa78-a3aaacf1a63a");
    }, []);

    return null;
}