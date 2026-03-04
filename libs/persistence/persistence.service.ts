import { createHash } from "node:crypto";
import { PathLike } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Injectable, Logger } from "@nestjs/common";

export interface StorageOptions {
  storageDir?: string;
}

export interface StoredData<T = unknown> {
  data: T;
  timestamp: number;
  checksum: string;
}

@Injectable()
export class PersistenceService<T> {
  protected logger = new Logger(PersistenceService.name);
  private readonly storageDir: PathLike;

  constructor(options: StorageOptions = {}) {
    this.storageDir = options.storageDir || path.join(process.cwd(), "storage");
    void this.ensureStorageDirectory();
  }

  /**
   * Stocke un objet sérialisable de manière sécurisée
   * @param key Clé unique pour identifier les données
   * @param data Données à stocker (doit être sérialisable avec JSON.stringify)
   */
  async store(key: string, data: T): Promise<void> {
    try {
      this.validateKey(key);
      this.validateSerializableData(data);

      const storedData: StoredData<T> = {
        data,
        timestamp: Date.now(),
        checksum: this.generateChecksum(data),
      };

      const serializedData = JSON.stringify(storedData, null, 2);

      const filePath = this.getFilePath(key, this.storageDir);
      await fs.writeFile(filePath, serializedData, "utf8");

      this.logger.log(`Data stored successfully with key: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to store data with key ${key}:`, error);
      throw new Error(
        `Storage operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Récupère des données stockées
   * @param key Clé unique des données à récupérer
   */
  async retrieve(key: string): Promise<T | null> {
    const storedData = await this.retrieveStoredData(key);
    return storedData ? storedData.data : null;
  }

  /**
   * Récupère les données stockées avec leurs métadonnées
   * @param key Clé unique des données à récupérer
   */
  async retrieveStoredData(key: string): Promise<StoredData<T> | null> {
    try {
      this.validateKey(key);

      const filePath = this.getFilePath(key, this.storageDir);

      // Vérifier si le fichier existe
      try {
        await fs.access(filePath);
      } catch {
        this.logger.warn(`No data found for key: ${key}`);
        return null;
      }

      const fileContent = await fs.readFile(filePath, "utf8");
      const storedData = JSON.parse(fileContent) as StoredData<T>;

      // Vérifier l'intégrité des données
      if (!this.verifyChecksum(storedData.data, storedData.checksum)) {
        throw new Error("Data integrity check failed");
      }

      this.logger.log(`Data retrieved successfully with key: ${key}`);
      return storedData;
    } catch (error) {
      this.logger.error(`Failed to retrieve data with key ${key}:`, error);
      throw new Error(
        `Retrieval operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Supprime des données stockées
   * @param key Clé unique des données à supprimer
   */
  async remove(key: string): Promise<boolean> {
    try {
      this.validateKey(key);

      const filePath = this.getFilePath(key, this.storageDir);

      try {
        await fs.unlink(filePath);
        this.logger.log(`Data removed successfully with key: ${key}`);
        return true;
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          this.logger.warn(`No data found to remove for key: ${key}`);
          return false;
        }
        throw error;
      }
    } catch (error) {
      this.logger.error(`Failed to remove data with key ${key}:`, error);
      throw new Error(
        `Removal operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Vérifie si des données existent pour une clé donnée
   * @param key Clé à vérifier
   */
  async exists(key: string): Promise<boolean> {
    try {
      this.validateKey(key);
      try {
        const data = await this.retrieve(key);
        return data !== null;
      } catch {
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to check existence for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Liste toutes les clés stockées
   */
  async listKeys(): Promise<string[]> {
    try {
      try {
        const files = await fs.readdir(this.storageDir);
        return files
          .filter((file) => file.endsWith(".json"))
          .map((file) => file.replace(".json", ""));
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return [];
        }
        throw error;
      }
    } catch (error) {
      this.logger.error("Failed to list keys:", error);
      throw new Error(
        `List operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Nettoie les données expirées
   * @param maxAge Âge maximum en millisecondes
   */
  async cleanup(maxAge: number): Promise<number> {
    try {
      const keys = await this.listKeys();
      const now = Date.now();
      let removedCount = 0;

      for (const key of keys) {
        try {
          const storedData = await this.retrieveStoredData(key);
          if (storedData && now - storedData.timestamp > maxAge) {
            await this.remove(key);
            removedCount++;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to process key ${key} during cleanup:`,
            error,
          );
        }
      }

      this.logger.log(
        `Cleanup completed. Removed ${removedCount} expired entries.`,
      );
      return removedCount;
    } catch (error) {
      this.logger.error("Failed to perform cleanup:", error);
      throw new Error(
        `Cleanup operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      this.logger.error("Failed to create storage directory:", error);
    }
  }

  private validateKey(key: string): void {
    if (!key || typeof key !== "string" || key.trim().length === 0) {
      throw new Error("Key must be a non-empty string");
    }

    // Vérifier que la clé ne contient pas de caractères dangereux pour les noms de fichiers
    if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
      throw new Error(
        "Key contains invalid characters. Use only alphanumeric characters, dots, hyphens, and underscores.",
      );
    }
  }

  private validateSerializableData(data: T): void {
    try {
      JSON.stringify(data);
    } catch (error) {
      throw new Error(
        `Data is not serializable: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private getFilePath(key: string, storageDir: PathLike): string {
    return path.join(storageDir as string, `${key}.json`);
  }

  private generateChecksum(data: T): string {
    const serializedData = JSON.stringify(data);
    return createHash("sha256").update(serializedData).digest("hex");
  }

  private verifyChecksum(data: T, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }
}
