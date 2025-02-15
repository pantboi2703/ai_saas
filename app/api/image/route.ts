import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { increaseApiLimit, checkApiLimit } from "@/lib/api-limit";
//import { Configuration, OpenAIApi} from "openai"
//v3
/*const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);
*/

//v4
import OpenAI from 'openai';
import { checkSubscription } from "@/lib/subscription";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });


export async function POST(req:Request) {
    try{
        const { userId } = await auth();
        const body = await req.json();
        const { prompt, amount = 1, resolution = "512x512" } = body;

        if(!userId){
            return new NextResponse("Unauthorized", {status:401});
        }

        if(!openai.apiKey){
            return new NextResponse("OpenAI API Key not Configured", {status:500});
        }

        if(!prompt){
            return new NextResponse("Prompt is required", {status:400});
        }

        if(!amount){
            return new NextResponse("Amount is required", {status:400});
        }

        if(!resolution){
            return new NextResponse("Resolution is required", {status:400});
        }

        const freeTrial = await checkApiLimit();
        const isPro = await checkSubscription();

        if (!freeTrial && !isPro) {
            return new NextResponse("Free trial has expired.", { status: 403});
        }

        const response = await openai.images.generate({
            prompt,
            size:resolution,
            n:parseInt(amount,10),
        });
        
        if (!isPro) {
            await increaseApiLimit();
        }

        return NextResponse.json(response.data);

    }catch(error){
        console.log("[IMAGE_ERROR",error);
        return new NextResponse("Internal error",{status:500});
    }
}