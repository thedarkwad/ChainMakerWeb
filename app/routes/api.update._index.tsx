import { ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { loadChain, updateChain, uploadChain } from "~/db.server";
import { promises as fs, existsSync } from "fs";
import path from "path";
import Chain from "~/jumpchain/Chain";

const appRoot = process.cwd();

export async function action({
  request,
}: ActionFunctionArgs) {

  let cleanUpImages = async (chain: Chain, chainId: string) => {
    if (!/^[a-zA-Z0-9_-]*$/.test(chainId))
      return;
    try {
      let altFormsWithImages = Object.keys(chain.altforms).filter((id) => !!chain.altforms[Number(id)].imageUploaded);
      let imageDirectory = path.join(appRoot, "public/user_images", chainId);
      if (!existsSync(imageDirectory)) return;
      const files = await fs.readdir(imageDirectory);
      const fileToDelete = files.filter((file) => !altFormsWithImages.includes(path.parse(file).name));
      for (let file of fileToDelete) {
        await fs.unlink(path.join(imageDirectory, file));
      }
    } catch (e) { console.error(e); }

  }

  const body = await request.json();
  let doc = await loadChain(body.id);
  if (!doc)
    throw new Response(null, {
      status: 500,
      statusText: "Save Error",
    });

  if (body.edits != doc.edits) {
    return json({ editRace: true, error: "An edit race has been detected. This is often caused by having the same chain open in two tabs. Please ensure that you would like to overwrite any other changes before saving your chain again. Autosave has been disabled." });
  }
  try {
    await updateChain(body.updates, doc);
  } catch(e) {
    console.error(e);
    return json({ error: "Unknown error encounted while saving. Please try again." })
  }
  cleanUpImages(doc.chain!, body.id);
  return json({ success: true });
}
