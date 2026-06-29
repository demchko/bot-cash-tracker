import {readFile, writeFile} from 'fs/promises';

export async function readData(){
    try {
        const data = JSON.parse(await readFile('./data.json', 'utf8'));
        return data;
    } catch (err){
        console.log(err);
        return {};
    }
}

export async function writeData(obj){
    await writeFile("./data.json", JSON.stringify(obj));
}