import threading
import time
import sys
import traceback

from proptrex_radar.server import main as server_main
from proptrex_radar.workers.realization_worker import run_once as run_realization
from proptrex_radar.control.auditor.enforcement_runner import main as run_enforcement


def realization_loop() -> None:
    print("[Worker] Realization scanner loop started.", flush=True)
    # İlk çalışma öncesinde HTTP sunucusunun dinlemeye başlaması için kısa bir gecikme
    time.sleep(15)
    while True:
        try:
            print("[Worker] Running realization worker analysis...", flush=True)
            result = run_realization()
            status = result.get("ok", False)
            print(f"[Worker] Realization check completed. status={status}", flush=True)
        except Exception as e:
            print(f"[Worker] Realization worker error: {e}", file=sys.stderr, flush=True)
            traceback.print_exc()
        time.sleep(60)


def enforcement_loop() -> None:
    print("[Worker] Auditor enforcement loop started.", flush=True)
    time.sleep(30)
    while True:
        try:
            print("[Worker] Running auditor enforcement...", flush=True)
            code = run_enforcement([])
            print(f"[Worker] Enforcement completed with code={code}", flush=True)
        except Exception as e:
            print(f"[Worker] Enforcement error: {e}", file=sys.stderr, flush=True)
            traceback.print_exc()
        time.sleep(300)


def main() -> None:
    # Arka plan iş parçacıklarını başlat (deamon true olmalı ki server kapanınca bunlar da kapansın)
    realization_thread = threading.Thread(target=realization_loop, daemon=True)
    enforcement_thread = threading.Thread(target=enforcement_loop, daemon=True)

    realization_thread.start()
    enforcement_thread.start()

    print("Background worker threads started successfully.", flush=True)
    
    # Bloklayıcı (Sürekli dinleyen) ana web sunucusunu ana iş parçacığında (main thread) çalıştırıyoruz
    server_main()


if __name__ == "__main__":
    main()

