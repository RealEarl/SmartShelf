import multiprocessing
import capture_mainsystem_button
import aruco_subsystem

if __name__ == '__main__':
    # CRITICAL: This line is required to prevent PyInstaller from crashing
    # when it turns this multiprocessing script into an .exe
    multiprocessing.freeze_support()

    print("Booting SmartShelf Dual-Core Architecture...")

    # Assign the scripts to two different CPU processes
    process_scanner = multiprocessing.Process(target=capture_mainsystem_button.start_scanner)
    process_aruco = multiprocessing.Process(target=aruco_subsystem.start_aruco)

    # Start them both at the exact same time
    process_scanner.start()
    process_aruco.start()

    # Keep the main app alive while the background processes run
    process_scanner.join()
    process_aruco.join()