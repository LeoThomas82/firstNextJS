import connection from "../../lib/db";

export default async function handler(req, res) {
    try {
        const [rows] = await connection.query("SELECT * from users");
        console.log(rows);
        res.status(200).json(rows);
    } catch(error){
        console.error(error);
        res.status(500).json({message:"Internal server error"});
    }
}