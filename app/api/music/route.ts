// import { auth } from "@clerk/nextjs/server";
// import { NextResponse } from "next/server";
// import Replicate from "replicate";

// import { increaseApiLimit, checkApiLimit } from "@/lib/api-limit";
// import { checkSubscription } from "@/lib/subscription";

// const replicate = new Replicate({
//     auth: process.env.REPLICATE_API_TOKEN,
// });

// export async function POST(req:Request) {
//     try{
//         const { userId } = await auth();
//         const body = await req.json();
//         const { prompt } = body;

//         if (!process.env.REPLICATE_API_TOKEN) {
//             throw new Error(
//               'The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it.'
//             );
//         }

//         if(!userId){
//             return new NextResponse("Unauthorized", {status:401});
//         }

//         if(!prompt){
//             return new NextResponse("Prompt is required", {status:400});
//         }

//         const freeTrial = await checkApiLimit();
//         const isPro = await checkSubscription();

//         if (!freeTrial && !isPro) {
//             return new NextResponse("Free trial has expired.", { status: 403});
//         }

//         // const response = await replicate.run(
//         //     "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
//         //      { 
//         //         input: {
//         //             prompt_a: prompt
//         //         } 
//         //     }
//         // );

//         const response = await Promise.race([
//             replicate.run("riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05", {
//               input: { prompt_a: prompt }
//             }),
//             new Promise((_, reject) =>
//               setTimeout(() => reject(new Error('Request timed out')), 30000) // 30 seconds timeout
//             )
//           ]);
          
        
//         if (!isPro) {
//             await increaseApiLimit();
//         }
        
//         return NextResponse.json(response);
//     } catch(error){
//         console.log("[MUSIC_ERROR]",error);
//         return new NextResponse("Internal error",{status:500});
//     }
// }

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Replicate from "replicate";

import { increaseApiLimit, checkApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

const TIMEOUT_LIMIT = 60000; // 60 seconds
const MAX_RETRIES = 3;

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        const body = await req.json();
        const { prompt } = body;

        if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error(
                'The REPLICATE_API_TOKEN environment variable is not set. See README.md for instructions on how to set it.'
            );
        }

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!prompt) {
            return new NextResponse("Prompt is required", { status: 400 });
        }

        const freeTrial = await checkApiLimit();
        const isPro = await checkSubscription();

        if (!freeTrial && !isPro) {
            return new NextResponse("Free trial has expired.", { status: 403 });
        }

        let response;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_LIMIT);

            try {
                console.log("Running replicate...");
                response = await replicate.run(
                    "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
                    {
                        input: { prompt_a: prompt },
                        signal: controller.signal
                    }
                );
                console.log("Replicate response:", response);
                clearTimeout(timeoutId); // Clear the timeout if successful
                break; // Exit loop if successful
            } catch (error) {
                console.log(`Attempt ${attempt + 1} failed:`, error);
                if (attempt === MAX_RETRIES - 1) {
                    throw error; // Rethrow if all retries fail
                }
            }
        }

        if (!isPro) {
            await increaseApiLimit();
        }

        return NextResponse.json(response);
    } catch (error) {
        console.log("[MUSIC_ERROR]", error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
