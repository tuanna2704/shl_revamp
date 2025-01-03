import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';
import { randomStringWithEntropy } from './utils';
import { HealthLink, HealthLinkFile } from './types';
import { createHash } from 'crypto';
@Injectable()
export class ShlService {
  constructor(private prisma: PrismaService) {}

  async createLink(config: Prisma.ShlinkCreateInput) {
    const newLink = await this.prisma.shlink.create({
      data: {
        ...config,
        id: randomStringWithEntropy(32),
        managementToken: randomStringWithEntropy(32),
      },
    });
    return newLink;
  }

  async linkExists(linkId: string): Promise<boolean> {
    const link = await this.prisma.shlink.findFirst({
      where: {
        id: linkId,
        active: true,
      },
    });
    return Boolean(link);
  }

  async getManagedShl(linkId: string, managementToken: string): Promise<HealthLink | null> {
    const linkRow = await this.prisma.shlink.findFirst({
      where: {
        id: linkId,
        managementToken,
      },
    });

    if (!linkRow) {
      return null; // Return null if no matching link is found
    }

    return {
      id: linkRow.id,
      passcodeFailuresRemaining: linkRow.passcodeFailuresRemaining,
      active: Boolean(linkRow.active),
      managementToken: linkRow.managementToken,
      config: {
        exp: linkRow.configExp?.getTime(),
        passcode: linkRow.configPasscode,
      },
    };
  }

  async addFile(linkId: string, file: HealthLinkFile) {
    // Create a SHA-256 hash of the file content
    const hash = createHash('sha256');
    hash.update(file.content);
    const hashEncoded = hash.digest('base64url'); // Convert to base64url encoding
    // Insert the file hash and content into the CAS item table
    const result = await this.prisma.casItem.upsert({
      where: { hash: hashEncoded },
      update: {}, // No update necessary, just ensure the hash is unique
      create: {
        hash: hashEncoded,
        content: file.content,
      },
    });

    // Insert the file record into the shlink_file table
    await this.prisma.shlinkFile.create({
      data: {
        contentType: file.contentType,
        shlink: {
          connect: { id: linkId }, // Connect to an existing Shlink
        },
        content: {
          connect: {
            hash: hashEncoded, // Connect to the related CasItem
          },
        },
      },
    });

    return hashEncoded;
  }
}
