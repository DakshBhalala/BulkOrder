import asyncio
from app.services.engine import simulation_engine

async def main():
    print("Starting engine")
    task = asyncio.create_task(simulation_engine())
    await asyncio.sleep(4)
    print("Cancelling engine")
    task.cancel()

if __name__ == "__main__":
    asyncio.run(main())
