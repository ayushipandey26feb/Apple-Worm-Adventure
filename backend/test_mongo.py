
import asyncio
from lib.db import client

async def main():
    try:
        await client.admin.command("ping")
        print("MongoDB Atlas Connected Successfully!")
    except Exception as e:
        print("MongoDB Connection Failed:", e)
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
