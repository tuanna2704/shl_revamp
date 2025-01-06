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

  async getShlInternal(linkId: string): Promise<HealthLink> {
    // Query the database using Prisma
    const linkRow = await this.prisma.shlink.findUnique({
      where: { id: linkId },
    });
 
    if (!linkRow) return null;
 
    // Map the database result to the expected HealthLink format
    return {
      id: linkRow.id,
      passcodeFailuresRemaining: linkRow.passcodeFailuresRemaining,
      active: !!linkRow.active,
      managementToken: linkRow.managementToken,
      config: {
        exp: linkRow.configExp?.getTime(),
        passcode: linkRow.configPasscode,
      },
    };
  }
 
  async recordPasscodeFailure(shlId: string): Promise<void> {
    await this.prisma.shlink.update({
      where: { id: shlId },
      data: {
        passcodeFailuresRemaining: {
          decrement: 1,
        },
      },
    });
  }
 
  async recordAccess(shlId: string, recipient: string): Promise<void> {
    // Insert a new record into the `shlink_access` table

    await this.prisma.shlinkAccess.create({
      data: {
        shlinkRel: { connect: { id: shlId } }, // Connects to the related `Shlink` record
        recipient,
      },
    });
  }
 
  async getManifestFiles(linkId: string, embeddedLengthMax?: number): Promise<{ contentType: string; hash: string; content?: string }[]> {
    const files = await this.prisma.shlinkFile.findMany({
      where: {
        shlinkId: linkId,
      },
      include: {
        content: true, // Include the related CasItem data
      },
    });
 
    // Map the query results to the desired output format
    const result = files.map(({ contentType, contentHash, content: { content } }) => ({
      contentType: contentType, // Assuming `contentType` is the field in `shlink_file`
      hash: contentHash,       // Assuming `contentHash` is the field in `shlink_file`
      content:
        content && content.length <= (embeddedLengthMax || Infinity) ? content : undefined,
    }));
    return result
  }
 
  // Fetch manifest endpoints
  async getManifestEndpoints(linkId: string): Promise<{ contentType: string; id: string }[]> {
    const endpoints = await this.prisma.shlinkEndpoint.findMany({
      where: {
        shlinkId: linkId,
      },
      select: {
        id: true,
      },
    });    
 
    // Map the query results to the desired output format
    return endpoints.map((endpoint) => ({
      contentType: 'application/smart-api-access',
      id: endpoint.id,
    }));
  }

  async deactivateShl(shlinkId: string): Promise<boolean> {
    try {
      await this.prisma.shlink.update({
        where: { id: shlinkId },
        data: { active: false },
      });
      return true;
    } catch (error) {
      console.error('Error deactivating SHL:', error);
      return false;
    }
  }
}
